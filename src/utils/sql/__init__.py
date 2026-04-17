# https://github.com/Bishoko/Bishokus/blob/main/utils/sql/__init__.py

import mysql.connector
import os
from typing import Any, cast
from src.utils.config import config
from src.utils.logger import log

db_config = config["mysql"]


def get_db_connection():
    """
    Establishes and returns a connection to the MySQL database.

    This function attempts to connect to the database using the configuration
    specified in the 'db_config' dictionary. If the initial connection fails
    due to a ProgrammingError (which might occur if the database doesn't exist),
    it will create the database and then attempt to connect again.

    Returns:
        mysql.connector.connection.MySQLConnection: A connection object to the MySQL database.

    Raises:
        mysql.connector.Error: If there's an error connecting to the database
        that isn't resolved by creating the database.

    Note:
        This function relies on the 'db_config' dictionary being properly
        populated with the necessary connection parameters.
    """
    db_cfg = dict(db_config)
    try:
        return mysql.connector.connect(**db_cfg)
    except mysql.connector.errors.ProgrammingError:

        database = db_cfg['database']
        del db_cfg['database']

        conn = mysql.connector.connect(**db_cfg)
        cursor = conn.cursor()

        create_database(cursor, database)

        db_cfg['database'] = database
        return mysql.connector.connect(**db_cfg)


def create_database(cursor, db_name):
    """
    Creates a database if it does not exist.

    :param cursor: MySQL cursor object
    :param db_name: Name of the database to create
    """
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} DEFAULT CHARACTER SET 'utf8'")
        log.info(f"Database {db_name} created or already exists.")
    except mysql.connector.Error as err:
        log.exception(err, f"Failed to create database {db_name}")
        exit(1)

def execute_sql_file(cursor, sql_file_path, replacements=None):
    """
    Executes a SQL file with caching.

    :param cursor: MySQL cursor object
    :param sql_file_path: Path to the SQL file
    :param replacements: Dictionary of replacements for %s placeholders
    """
    cache = {}

    def read_file(path):
        if path not in cache:
            with open(path, 'r') as file:
                cache[path] = file.read()
        return cache[path]

    def clear_cache():
        cache.clear()

    sql_commands = read_file(sql_file_path).split(';')
    for command in sql_commands:
        command = command.strip()
        if command:
            if replacements:
                cursor.execute(command, replacements)
            else:
                cursor.execute(command)

    # Clear cache if file has been modified
    if os.path.getmtime(sql_file_path) > cache.get(sql_file_path + '_mtime', 0):
        clear_cache()
        cache[sql_file_path + '_mtime'] = os.path.getmtime(sql_file_path)

def init():
    """
    Initializes the database connection, executes SQL file, and performs initial setup.
    """

    conn = get_db_connection()
    cursor = conn.cursor()
    
    execute_sql_file(cursor, 'src/utils/sql/init_db.sql')
    
    conn.commit()
    conn.close()


def insert_mii(unique_id, name=None, author=None, description=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO miis (unique_id, name, author, description)
        VALUES (%s, %s, %s, %s)
        """,
        (unique_id, name, author, description),
    )
    conn.commit()
    conn.close()


def insert_mii_images(unique_id, image_paths):
    if not image_paths:
        return

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.executemany(
        """
        INSERT INTO mii_images (mii_unique_id, image_path)
        VALUES (%s, %s)
        """,
        [(unique_id, image_path) for image_path in image_paths],
    )
    conn.commit()
    conn.close()


def get_mii(unique_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT unique_id, name, author, description, created_at
        FROM miis
        WHERE unique_id = %s
        """,
        (unique_id,),
    )
    mii_row = cast(dict[str, Any] | None, cursor.fetchone())
    if not mii_row:
        conn.close()
        return None

    cursor.execute(
        """
        SELECT image_path
        FROM mii_images
        WHERE mii_unique_id = %s
        ORDER BY id ASC
        """,
        (unique_id,),
    )
    image_rows = cast(list[dict[str, Any]], cursor.fetchall())
    images = [str(row["image_path"]) for row in image_rows]
    conn.close()

    return {
        "unique_id": mii_row["unique_id"],
        "name": mii_row["name"],
        "author": mii_row["author"],
        "description": mii_row["description"],
        "created_at": mii_row["created_at"],
        "images": images,
    }
