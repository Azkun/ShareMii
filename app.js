const uploadPanel = document.getElementById('uploadPanel');
const editorPanel = document.getElementById('editorPanel');
const saveFolderInput = document.getElementById('saveFolder');
const errorMsg = document.getElementById('errorMsg');
const saveBtn = document.getElementById('saveBtn');
const importFileInput = document.getElementById('importFile');

let miiSavBuffer = null;
let playerSavBuffer = null;
let ugcFiles = new Map();

let currentImportSlot = -1;
let currentImportType = "";

// --- toast ---

function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toastContainer').appendChild(el);
    // double rAF ensures the initial style is painted before the transition fires
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('toast-show')));
    setTimeout(() => {
        el.classList.remove('toast-show');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 3000);
}

// hex string -> little-endian Uint8Array
function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes).reverse();
}

// find the absolute offset of a hash signature in a buffer
function offsetLocator(buffer, hashStr) {
    if (typeof hashStr === 'number') return hashStr;
    const hash = hexToBytes(hashStr);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < view.length - 8; i++) {
        if (view[i] === hash[0] && view[i + 1] === hash[1] && view[i + 2] === hash[2] && view[i + 3] === hash[3]) {
            const offsetView = new DataView(buffer, i + 4, 4);
            let ptr = offsetView.getUint32(0, true);
            if (hashStr !== "114EFF89") ptr += 4;
            return ptr;
        }
    }
    return null;
}

function readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

// --- upload ---

saveFolderInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    errorMsg.classList.add('hidden');

    let miiFile = null;
    let playerFile = null;
    ugcFiles.clear();

    for (const file of files) {
        if (file.name === 'Mii.sav') miiFile = file;
        else if (file.name === 'Player.sav') playerFile = file;
        else if (file.webkitRelativePath.includes('/Ugc/')) {
            const fileName = file.webkitRelativePath.split('/').pop();
            const data = await readFileAsBuffer(file);
            ugcFiles.set(fileName, new Uint8Array(data));
        }
    }

    if (!miiFile || !playerFile) {
        errorMsg.textContent = "couldn't find Mii.sav or Player.sav in the selected folder.";
        errorMsg.classList.remove('hidden');
        return;
    }

    miiSavBuffer = await readFileAsBuffer(miiFile);
    playerSavBuffer = await readFileAsBuffer(playerFile);

    await populateLists();

    uploadPanel.classList.add('hidden');
    editorPanel.classList.remove('hidden');
});

function handleZipFile(file) {
    if (!file) return;

    errorMsg.classList.add('hidden');
    ugcFiles.clear();

    JSZip.loadAsync(file).then(async (zip) => {
        let miiFileEntry = null;
        let playerFileEntry = null;

        const promises = [];
        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;

            const name = zipEntry.name;
            if (name.endsWith('Mii.sav')) {
                miiFileEntry = zipEntry;
            } else if (name.endsWith('Player.sav')) {
                playerFileEntry = zipEntry;
            } else if (name.includes('/Ugc/') || name.includes('Ugc/')) {
                const fileName = name.split('/').pop().split('\\').pop();
                if (fileName) {
                    promises.push(zipEntry.async("uint8array").then(data => {
                        ugcFiles.set(fileName, data);
                    }));
                }
            }
        });

        await Promise.all(promises);

        if (!miiFileEntry || !playerFileEntry) {
            errorMsg.textContent = "couldn't find Mii.sav or Player.sav in that zip.";
            errorMsg.classList.remove('hidden');
            return;
        }

        miiSavBuffer = await miiFileEntry.async("arraybuffer");
        playerSavBuffer = await playerFileEntry.async("arraybuffer");

        await populateLists();
        uploadPanel.classList.add('hidden');
        editorPanel.classList.remove('hidden');

    }).catch(err => {
        errorMsg.textContent = "failed to read zip: " + err.message;
        errorMsg.classList.remove('hidden');
    });
}

document.getElementById('saveZip').addEventListener('change', (e) => {
    handleZipFile(e.target.files[0]);
});

uploadPanel.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadPanel.classList.add('dragover');
});

uploadPanel.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadPanel.classList.remove('dragover');
});

uploadPanel.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadPanel.classList.remove('dragover');

    if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            if (e.dataTransfer.items[i].kind === 'file') {
                const file = e.dataTransfer.items[i].getAsFile();
                if (file.name.endsWith('.zip')) {
                    handleZipFile(file);
                    return;
                }
            }
        }

        if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].name.endsWith('.zip')) {
            handleZipFile(e.dataTransfer.files[0]);
        } else {
            errorMsg.textContent = "drop a .zip containing your save data.";
            errorMsg.classList.remove('hidden');
        }
    }
});

// --- helpers ---

function decodeName(uint8array) {
    let endIdx = uint8array.length;
    for (let i = 0; i < uint8array.length - 2; i++) {
        if (uint8array[i] === 0 && uint8array[i + 1] === 0 && uint8array[i + 2] === 0) {
            endIdx = i;
            break;
        }
    }

    let slice = uint8array.slice(0, endIdx);
    if (slice.length % 2 === 1) {
        let temp = new Uint8Array(slice.length + 1);
        temp.set(slice);
        temp[slice.length] = 0;
        slice = temp;
    }

    let chars = [];
    for (let i = 0; i < slice.length; i += 2) {
        chars.push(String.fromCharCode(slice[i] | (slice[i + 1] << 8)));
    }
    return chars.join('');
}

function sumBytes(u8array) {
    let sum = 0;
    for (let i = 0; i < u8array.length; i++) sum += u8array[i];
    return sum;
}

// --- list rendering ---

function populateLists() {
    const miiView = new Uint8Array(miiSavBuffer);
    const miiListEl = document.getElementById('miiList');
    miiListEl.innerHTML = "";

    // draft mii lives in player.sav, not mii.sav
    const miiTempOffset = offsetLocator(playerSavBuffer, Constants.Mii.offsets.miiTemp);
    if (miiTempOffset !== null) {
        const row = document.createElement('li');
        row.className = 'item-row buffer';
        row.innerHTML = `
            <div class="item-info">
                <span class="item-name">📝 Draft Mii</span>
                <span class="item-slot">In-Progress Mii</span>
            </div>
            <div class="item-actions">
                <button class="btn action-btn" onclick="exportMii(-1)">Export</button>
                <button class="btn action-btn import" onclick="triggerImport('mii', -1)">Import</button>
            </div>
        `;
        miiListEl.appendChild(row);
    }

    const miiOffset6 = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiRaw);
    const miiNames = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiNames);

    for (let slot = 0; slot < 69; slot++) {
        const index = miiOffset6 + 156 * slot;
        const slice = miiView.slice(index, index + 156);
        if (sumBytes(slice) === 152) continue;

        const nameBytes = miiView.slice(miiNames + (slot * 64), miiNames + (slot * 64) + 64);
        let miiNameStr = decodeName(nameBytes) || "Unnamed Mii";
        let slotName = "Slot " + (slot + 1);

        const row = document.createElement('li');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="item-info">
                <span class="item-name">${miiNameStr}</span>
                <span class="item-slot">${slotName}</span>
            </div>
            <div class="item-actions">
                <button class="btn action-btn" onclick="exportMii(${slot})">Export</button>
                <button class="btn action-btn import" onclick="triggerImport('mii', ${slot})">Import</button>
            </div>
        `;
        miiListEl.appendChild(row);
    }
}

// --- import/export ---

function triggerImport(type, slot) {
    currentImportType = type;
    currentImportSlot = slot;
    importFileInput.value = "";
    importFileInput.click();
}

importFileInput.addEventListener('change', async (e) => {
    if (!e.target.files.length || currentImportSlot < -1) return;
    const file = e.target.files[0];
    const data = await readFileAsBuffer(file);
    const ltd = new Uint8Array(data);

    if (currentImportType === 'mii') {
        const miisav = new Uint8Array(miiSavBuffer);
        const playersav = new Uint8Array(playerSavBuffer);

        let miiIndex = -1;

        if (currentImportSlot === -1) {
            miiIndex = offsetLocator(playerSavBuffer, Constants.Mii.offsets.miiTemp);
            playersav.set(ltd.slice(4, 4 + 156), miiIndex);

            // reset facepaint slots for the draft mii so the game doesn't get confused
            const fpOffset1 = offsetLocator(playerSavBuffer, "4C9819E4") + 4;
            const fpOffset2 = offsetLocator(playerSavBuffer, "DECC8954") + 4;
            const fpOffset3 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpState);
            const fpOffset4 = offsetLocator(playerSavBuffer, "FFC750B6") + 4;
            const fpOffset5 = offsetLocator(playerSavBuffer, "A56E42EC") + 4;

            const usesFacepaint = ltd[1] === 1 && ltd[47] === 1;

            if (!usesFacepaint) {
                playersav.set(hexToBytes("00000000").reverse(), fpOffset1 + 4 * 70);
                playersav.set(hexToBytes("00000000").reverse(), fpOffset2 + 4 * 70);
                playersav.set(hexToBytes("A58A0000").reverse(), fpOffset3 + 4 * 70);
                playersav.set(hexToBytes("FFFFFFFF").reverse(), fpOffset4 + 4 * 70);
                playersav.set([0x46], fpOffset5 + 4 * 70);
            }

            toast("draft mii imported!");

        } else {
            miiIndex = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiRaw) + 156 * currentImportSlot;
            miisav.set(ltd.slice(4, 4 + 156), miiIndex);

            // if it's a v2+ ltd file, also inject personality/name/voice data
            if (ltd[0] >= 2) {
                for (let i = 0; i < 18; i++) {
                    const offsetHash = Constants.Mii.offsets.persArray[i];
                    const offset = offsetLocator(miiSavBuffer, offsetHash);
                    miisav.set(ltd.slice(160 + i * 4, 160 + i * 4 + 4), offset + currentImportSlot * 4);
                }

                const miiNames = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiNames);
                miisav.set(ltd.slice(232, 296), miiNames + currentImportSlot * 64);

                const miiPrefer = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiPronounce);
                miisav.set(ltd.slice(296, 424), miiPrefer + currentImportSlot * 128);

                const persOffsetSX = offsetLocator(miiSavBuffer, Constants.Mii.offsets.persSX);
                const sexualityBlock = miisav.slice(persOffsetSX, persOffsetSX + 27);

                let sexualityBits = [];
                for (let b of sexualityBlock) {
                    let binaryStr = b.toString(2).padStart(8, '0');
                    for (let i = 7; i >= 0; i--) sexualityBits.push(parseInt(binaryStr[i]));
                }

                const miiSexuality = ltd.slice(424, 427);
                for (let j = 0; j < 3; j++) sexualityBits[currentImportSlot * 3 + j] = miiSexuality[j];

                let result = new Uint8Array(27);
                for (let i = 0; i < sexualityBits.length; i += 8) {
                    let byteBits = sexualityBits.slice(i, i + 8);
                    let byteStr = "";
                    for (let k = 7; k >= 0; k--) byteStr += byteBits[k] !== undefined ? byteBits[k] : 0;
                    result[i / 8] = parseInt(byteStr, 2);
                }
                miisav.set(result, persOffsetSX);
            }

            // pull canvas + ugctex back out of the .ltd and register the facepaint with player.sav
            const fpIndexOffset = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiFpIndex);
            const fp1 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpPrice);
            const fp2 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpTex);
            const fp3 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpState);
            const fp4 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpUnk);
            const fp5 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpHash);

            if (ltd[0] >= 3 && ltd[1] === 1) {
                // find the A3/A4 markers that separate the fixed blocks from the texture payloads
                let canvasStart = -1, ugctexStart = -1;
                for (let i = 427; i < ltd.length - 4; i++) {
                    if (ltd[i] === 0xA3 && ltd[i + 1] === 0xA3 && ltd[i + 2] === 0xA3 && ltd[i + 3] === 0xA3) canvasStart = i + 4;
                    if (ltd[i] === 0xA4 && ltd[i + 1] === 0xA4 && ltd[i + 2] === 0xA4 && ltd[i + 3] === 0xA4) { ugctexStart = i + 4; break; }
                }

                // reuse existing fp slot or claim the lowest free one
                let fpId = miisav[fpIndexOffset + 4 * currentImportSlot];
                if (fpId === 255) {
                    const usedIds = new Set();
                    for (let s = 0; s < 69; s++) { const v = miisav[fpIndexOffset + 4 * s]; if (v !== 255) usedIds.add(v); }
                    for (let id = 0; id < 70; id++) { if (!usedIds.has(id)) { fpId = id; break; } }
                }

                // write miiFpIndex + the 5 player.sav registration values the game expects
                miisav.set(new Uint8Array([fpId, 0, 0, 0]), fpIndexOffset + 4 * currentImportSlot);
                playersav.set(new Uint8Array([0xF4, 0x01, 0x00, 0x00]), fp1 + 4 * fpId);
                playersav.set(new Uint8Array([0x41, 0x49, 0x93, 0x56]), fp2 + 4 * fpId);
                playersav.set(new Uint8Array([0xF4, 0xAD, 0x7F, 0x1D]), fp3 + 4 * fpId);
                playersav.set(new Uint8Array([0x00, 0x80, 0x00, 0x00]), fp4 + 4 * fpId);
                playersav.set(new Uint8Array([fpId, 0x00, 0x08, 0x00]), fp5 + 4 * fpId);

                // mark byte 47 of the raw mii data so the game knows it has a facepaint
                miisav[miiIndex + 43] = 1;

                let fpStr = fpId < 10 ? "00" + fpId : "0" + fpId;
                if (canvasStart !== -1 && ugctexStart !== -1) {
                    ugcFiles.set(`UgcFacePaint${fpStr}.canvas.zs`, ltd.slice(canvasStart, ugctexStart - 4));
                    ugcFiles.set(`UgcFacePaint${fpStr}.ugctex.zs`, ltd.slice(ugctexStart));
                }
            } else if (ltd[0] >= 3 && ltd[1] === 0) {
                // no facepaint; reset miiFpIndex and clear all 5 player.sav slots
                const fpId = miisav[fpIndexOffset + 4 * currentImportSlot];
                if (fpId !== 255) {
                    miisav.set(new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]), fpIndexOffset + 4 * currentImportSlot);
                    playersav.set(new Uint8Array([0x00, 0x00, 0x00, 0x00]), fp1 + 4 * fpId);
                    playersav.set(new Uint8Array([0x09, 0xDE, 0xEE, 0xB6]), fp2 + 4 * fpId);
                    playersav.set(new Uint8Array([0xA5, 0x8A, 0xFF, 0xAF]), fp3 + 4 * fpId);
                    playersav.set(new Uint8Array([0x00, 0x00, 0x00, 0x00]), fp4 + 4 * fpId);
                    playersav.set(new Uint8Array([0x00, 0x00, 0x00, 0x00]), fp5 + 4 * fpId);
                }
            }

            toast("slot " + (currentImportSlot + 1) + " imported!");
        }

        populateLists();
    }
});

window.exportMii = function (slot) {
    const miisav = new Uint8Array(miiSavBuffer);

    let facepaint = false;
    let facepaintID = 255;
    let miiIndex = -1;
    let targetSav = miisav;

    if (slot === -1) {
        const playersav = new Uint8Array(playerSavBuffer);
        const fpOffset3 = offsetLocator(playerSavBuffer, Constants.Mii.offsets.fpState);
        const paintindex = fpOffset3 + 4 * 70;
        const val = playersav.slice(paintindex, paintindex + 4);
        if (val[0] !== 0xA5 || val[1] !== 0x8A) {
            facepaint = true;
            facepaintID = 70;
        }
        miiIndex = offsetLocator(playerSavBuffer, Constants.Mii.offsets.miiTemp);
        targetSav = playersav;
    } else {
        const miiOffset2 = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiFpIndex);
        const fpIdBytes = miisav.slice(miiOffset2 + 4 * slot, miiOffset2 + 4 * slot + 4);
        if (fpIdBytes[0] !== 255) {
            facepaint = true;
            facepaintID = fpIdBytes[0];
        }
        miiIndex = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiRaw) + 156 * slot;
    }

    if (sumBytes(targetSav.slice(miiIndex, miiIndex + 156)) === 152) {
        toast("this mii slot is empty", 'error');
        return;
    }

    let personality = new Uint8Array(72);
    let nameBytes = new Uint8Array(64);
    let pronounceBytes = new Uint8Array(128);
    let miisexuality = [0, 0, 0, 0];

    if (slot !== -1) {
        for (let i = 0; i < 18; i++) {
            const offsetHash = Constants.Mii.offsets.persArray[i];
            const offset = offsetLocator(miiSavBuffer, offsetHash);
            let currP = miisav.slice(offset + slot * 4, offset + slot * 4 + 4);
            personality.set(currP, i * 4);
        }

        const persOffsetSX = offsetLocator(miiSavBuffer, Constants.Mii.offsets.persSX);
        const sexualityBlock = miisav.slice(persOffsetSX, persOffsetSX + 27);
        let sexualityBits = [];
        for (let b of sexualityBlock) {
            let binaryStr = b.toString(2).padStart(8, '0');
            for (let i = 7; i >= 0; i--) sexualityBits.push(parseInt(binaryStr[i]));
        }
        miisexuality = sexualityBits.slice(slot * 3, slot * 3 + 3);
        miisexuality.push(0);

        const miiNames = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiNames);
        const miiPrefer = offsetLocator(miiSavBuffer, Constants.Mii.offsets.miiPronounce);

        nameBytes = miisav.slice(miiNames + (slot * 64), miiNames + (slot * 64) + 64);
        pronounceBytes = miisav.slice(miiPrefer + (slot * 128), miiPrefer + (slot * 128) + 128);
    } else {
        nameBytes.set(hexToBytes("540065006D007000")); // "Temp"
    }

    const canvasSection = hexToBytes("A3A3A3A3");
    const ugcSection = hexToBytes("A4A4A4A4");

    let ltdData = new Uint8Array(3);
    let canvastex = new Uint8Array(0);
    let ugctex = new Uint8Array(0);

    if (facepaint) {
        let fpStr = facepaintID < 10 ? "00" + facepaintID : "0" + facepaintID;
        let cName = `UgcFacePaint${fpStr}.canvas.zs`;
        let uName = `UgcFacePaint${fpStr}.ugctex.zs`;
        if (ugcFiles.has(cName)) { canvastex = ugcFiles.get(cName); ltdData[0] = 1; }
        if (ugcFiles.has(uName)) { ugctex = ugcFiles.get(uName); ltdData[1] = 1; }
    }

    const miiDataStr = targetSav.slice(miiIndex, miiIndex + 156);
    const miiVersion = new Uint8Array([3]);
    let tLen = miiVersion.byteLength + ltdData.byteLength + miiDataStr.byteLength + personality.byteLength +
        nameBytes.byteLength + pronounceBytes.byteLength + 4 + canvasSection.byteLength + canvastex.byteLength +
        ugcSection.byteLength + ugctex.byteLength;

    let output = new Uint8Array(tLen);
    let curr = 0;
    const append = (buf) => {
        if (!buf) return;
        output.set(new Uint8Array(buf), curr);
        curr += buf.byteLength || buf.length;
    };

    append(miiVersion);
    append(ltdData);
    append(miiDataStr);
    append(personality);
    append(nameBytes);
    append(pronounceBytes);
    append(miisexuality);
    append(canvasSection);
    append(canvastex);
    append(ugcSection);
    append(ugctex);

    let printName = decodeName(nameBytes).replace(/[^\w.-]/g, '_');
    if (!printName) printName = "Unnamed_Mii";

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([output]));
    a.download = printName + ".ltd";
    a.click();
};

saveBtn.addEventListener('click', () => {
    const zip = new JSZip();
    zip.file("Mii.sav", miiSavBuffer);
    zip.file("Player.sav", playerSavBuffer);

    const ugcFolder = zip.folder("Ugc");
    ugcFiles.forEach((data, fileName) => {
        ugcFolder.file(fileName, data);
    });

    zip.generateAsync({ type: "blob" }).then(function (content) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = "ShareMii_Modified_Save.zip";
        a.click();
        toast("save exported!");
    });
});
