const Constants = {
    Mii: {
        offsets: {
            fpPrice: "4C9819E4", fpTex: "DECC8954", fpState: "23135BC5", fpUnk: "FFC750B6", fpHash: "A56E42EC",
            miiSort: 0x11420, miiFpIndex: "5E32ADF4", miiTemp: "114EFF89",
            miiNames: "2499BFDA", miiPronounce: "3A5EDA05", miiRaw: "881CA27A",
            persSX: "DFC82223",
            persArray: [
                "43CD364F", "CD8DBAF8", "25B48224", "607BA160", "607BA160",
                "4913AE1A", "141EE086", "07B9D175", "81CF470A", "4D78E262", "FBC3FFB0",
                "236E2D73", "F3C3DE59", "660C5247", "5D7D3F45", "AB8AE08B", "2545E583", "6CF484F4"
            ]
        }
    },
    // UGC Config generated roughly from ShareUGC.py, currently unused because UGC wouldn't work at all :( - qwkun
    UGC: [
        {
            kind: 0, typeName: "Food", maxSlots: 99,
            ugcOffsets: ["307FEEFA", "6F93FFBD", "5CA9336E", "F768620A", "5AF04BEB", "2DB168C5", "634800AE", "DD8D6C5A", "AF1186CF", "58E6AAD3"],
            nameOffset: "408494F5", nameCallOffset: "BA0F4BAF",
            enableOffset: "F4A39965", texOffset: "3558B77F", hashOffset: "6D48F8E2", hashIndex: 1
        },
        {
            kind: 1, typeName: "Cloth", maxSlots: 299,
            ugcOffsets: ["C81545FE", "2FB9146D", "7A31EF97", "7EEC35E9", "5E32FD3F", "0DBABE27", "71621C98", "2D271339", "CDF31EB5", "2823DBD3"],
            nameOffset: "40710642", nameCallOffset: "CF9A13EA",
            enableOffset: "AF129C33", texOffset: "59BFA9D3", hashOffset: "89F25CAC", hashIndex: 3
        },
        {
            kind: 2, typeName: "Goods", maxSlots: 99,
            ugcOffsets: ["3FAA2222", "823F8297", "7ECC8A60", "88DC1D43", "8896DDD6", "BFF29472", "5D965762", "78D39208", "53C762B0", "40D2C6FE", "C0A6C046", "AE373B0D", "7D5FFBB7", "9E978F5E", "F6349929", "9038CDD0", "9A59F58A"],
            nameOffset: "2F793EB1", nameCallOffset: "F655B33A", textOffset: "F36A5A0B", textCallOffset: "A66367EB", vOffset: "F36C4E28",
            enableOffset: "1A9C00FE", texOffset: "70D10A48", hashOffset: "56202100", hashIndex: 2
        },
        {
            kind: 3, typeName: "Interior", maxSlots: 99,
            ugcOffsets: ["A9116402", "835114C1", "EC65E2E4", "0A7CF2C5", "662CD807", "01B3661E", "5AF4A09F", "41FF2201"],
            nameOffset: "3DE2C5DD", nameCallOffset: "85A37B90",
            enableOffset: "A39744E9", texOffset: "E7F9D439", hashOffset: "7FEF7F7D", hashIndex: 6
        },
        {
            kind: 4, typeName: "Exterior", maxSlots: 99,
            ugcOffsets: ["ED95CF0F", "43F509BA", "A7A0773C", "A7A0773C", "34BA6119", "5E6E9F8C", "2907C040", "97865D6B", "609F197D", "47A50525", "71EA7734"],
            nameOffset: "27C875D6", nameCallOffset: "0E15E3F8", vOffset: "3C14025E", v2Offset: "B9D21B4F",
            enableOffset: "F4BEADC2", texOffset: "16227C50", hashOffset: "38D72795", hashIndex: 7
        },
        {
            kind: 5, typeName: "MapObject", maxSlots: 99,
            ugcOffsets: ["274659D1", "DCE826FC", "E04E1E6B", "056F2F20", "BC7D7E30", "3C2BC52F", "CFFECCC2", "5C15E339", "5EFF5E0E", "9838264B", "48778DE6", "62AD5137", "D1B3B197"],
            nameOffset: "56F99338", nameCallOffset: "EE921AE2", vOffset: "27F2ECDE", v2Offset: "2F96203B",
            enableOffset: "5951050B", texOffset: "A9C5CFB8", hashOffset: "1B28B170", hashIndex: 4
        },
        {
            kind: 6, typeName: "MapFloor", maxSlots: 99,
            ugcOffsets: ["21D582D9", "DE7CB924", "E8BD8C89", "C35B8B0F", "60E280FB", "7EC3836A", "F209E2F9", "6D842ACC"],
            nameOffset: "918875A9", nameCallOffset: "503490E0",
            enableOffset: "A1126D32", texOffset: "06A7A14C", hashOffset: "816D50A3", hashIndex: 5
        }
    ]
};
