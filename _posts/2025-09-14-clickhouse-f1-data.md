---
layout: post
title: "ClickHouse และ F1 Data"
date: 2025-09-14
categories: [data-engineering]
tags: [clickhouse, f1, olap, python]
---

ผมจะการเขียน Blog ครั้งแรกด้วยการทดลองใช้ ClickHouse Version OpenSource ซึ่งเป็น Data Warehouse ที่มาแรงมาก ๆ ในตอนนี้ครับ โดยจะทดลองเอา Data จาก F1 บาง Race ของปี 2024 มาเล่นกัน

## เตรียม Environment

เริ่มจาก Install Package เพื่อ access F1 data ก่อน

```bash
pip install fastf1
```

ต่อมาก็จะเป็น ClickHouse เป็น OLAP ที่เราจะใช้กัน ในการเก็บข้อมูลจาก fastf1 เพื่อให้ง่ายต่อการ set-up สามารถใช้ docker-compose ตามนี้ได้เลยครับ

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.8-alpine
    container_name: clickhouse
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

volumes:
  clickhouse_data:
```

หลังจาก

```bash
docker compose up
```

ลอง access ClickHouse ผ่าน Web browser ดูที่ [http://localhost:8123/play](http://localhost:8123/play)

จะเจอ UI แบบนี้

![ClickHouse UI](/assets/images/Pasted%20image%2020250914174723.png)

## ทดสอบ FastF1

หลังจาก Install ทั้ง fastf1 และ ClickHouse เสร็จแล้ว มาลองทดสอบใช้ fastf1 เพื่อดึง Data มาแสดงกัน โดยเราจะลองที่ Race Monaco 2024

มาถึงตรงนี้ สามารถเปลี่ยน F1 data เป็นข้อมูลประเภทอื่นเช่นข้อมูลจาก Kaggle ก็ได้เหมืนกัน

```python
import fastf1
import pandas as pd
import os

# Create cache directory if it doesn't exist
os.makedirs('cache', exist_ok=True)
# Enable cache to speed up data loading
fastf1.Cache.enable_cache('cache')
# Load session data - 2024 Monaco Grand Prix Qualifying
session = fastf1.get_session(2024, 'Monaco', 'Q')

session.load()
# Get lap times for all drivers
laps = session.laps

# Display fastest lap for each driver
fastest_laps = laps.loc[laps.groupby('Driver')['LapTime'].idxmin()]
fastest_laps = fastest_laps[['Driver', 'Team', 'LapTime', 'Sector1Time', 'Sector2Time', 'Sector3Time']]
fastest_laps = fastest_laps.sort_values('LapTime').reset_index(drop=True)
print("2024 Monaco GP Qualifying - Fastest Laps")
print("=" * 50)
print(fastest_laps.to_string())

# Get telemetry data for the fastest lap
fastest_lap = laps.pick_fastest()
telemetry = fastest_lap.get_telemetry()
print("\n\nFastest Lap Telemetry Sample (first 10 rows):")
print("=" * 50)

# Check available columns and use only those present
available_cols = [col for col in ['Time', 'Speed', 'Throttle', 'Brake', 'nGear', 'DRS'] if col in telemetry.columns]
print(telemetry[available_cols].head(10))

# Calculate some basic statistics
print("\n\nTelemetry Statistics:")
print("=" * 50)
print(f"Max Speed: {telemetry['Speed'].max():.1f} km/h")
print(f"Average Speed: {telemetry['Speed'].mean():.1f} km/h")
print(f"Max Throttle: {telemetry['Throttle'].max():.1f}%")
print(f"Average Throttle: {telemetry['Throttle'].mean():.1f}%")
```

จาก Python Script ด้านบน จะให้ผลลัพธ์ออกมาแบบนี้

![FastF1 Output](/assets/images/Pasted%20image%2020250914201424.png)

## Load Data เข้า ClickHouse

ต่อมาจะลอง Insert data ไปที่ ClickHouse กัน ก่อนอื่นเรามา Install package ที่เป็น Connector ของ ClickHouse กันก่อน

```bash
pip install clickhouse-connect
```

หลังจาก Install เรียบร้อย เราจะทำการ load data เข้าไปใน ClickHouse ดูด้วย Python Script นี้

```python
import fastf1
import pandas as pd
import clickhouse_connect
import os
from datetime import datetime

# Create cache directory if it doesn't exist
os.makedirs('cache', exist_ok=True)

# Enable cache to speed up data loading
fastf1.Cache.enable_cache('cache')

# Connect to ClickHouse
client = clickhouse_connect.get_client(
    host='localhost',
    port=8123
)

# Load multiple sessions for more data
sessions_to_load = [
    (2024, 'Monaco', 'Q'),
    (2024, 'Monaco', 'R'),
    (2024, 'Silverstone', 'Q'),
    (2024, 'Silverstone', 'R'),
]

all_laps = []
all_telemetry = []

for year, gp, session_type in sessions_to_load:
    print(f"Loading {year} {gp} - {session_type}")
    try:
        session = fastf1.get_session(year, gp, session_type)
        session.load()

        # Get lap data
        laps = session.laps
        if not laps.empty:
            laps_df = laps[['Driver', 'Team', 'LapNumber', 'LapTime', 'Sector1Time',
                           'Sector2Time', 'Sector3Time', 'SpeedI1', 'SpeedI2', 'SpeedFL',
                           'SpeedST', 'IsPersonalBest', 'Compound', 'TyreLife']].copy()
            laps_df['GrandPrix'] = gp
            laps_df['Year'] = year
            laps_df['SessionType'] = session_type
            laps_df['SessionDate'] = session.date

            # Convert timedelta to seconds
            for col in ['LapTime', 'Sector1Time', 'Sector2Time', 'Sector3Time']:
                if col in laps_df.columns:
                    laps_df[col] = laps_df[col].dt.total_seconds()

            all_laps.append(laps_df)

        # Get telemetry for fastest lap
        if not laps.empty:
            fastest_lap = laps.pick_fastest()
            telemetry = fastest_lap.get_telemetry()

            if not telemetry.empty:
                telemetry_df = telemetry[['Time', 'Speed', 'Throttle', 'Brake',
                                         'nGear', 'DRS', 'RPM']].copy()
                telemetry_df['Driver'] = fastest_lap['Driver']
                telemetry_df['GrandPrix'] = gp
                telemetry_df['Year'] = year
                telemetry_df['SessionType'] = session_type
                telemetry_df['LapNumber'] = fastest_lap['LapNumber']

                # Convert Time to seconds
                telemetry_df['Time'] = telemetry_df['Time'].dt.total_seconds()

                all_telemetry.append(telemetry_df)

    except Exception as e:
        print(f"Error loading {year} {gp} - {session_type}: {e}")
        continue

# Combine all data
laps_data = pd.concat(all_laps, ignore_index=True) if all_laps else pd.DataFrame()
telemetry_data = pd.concat(all_telemetry, ignore_index=True) if all_telemetry else pd.DataFrame()

print(f"\nCollected {len(laps_data)} lap records and {len(telemetry_data)} telemetry records")

# Create tables in ClickHouse
print("\nCreating ClickHouse tables...")

# Drop existing tables
client.command("DROP TABLE IF EXISTS f1_laps")
client.command("DROP TABLE IF EXISTS f1_telemetry")

# Create laps table
client.command("""
CREATE TABLE f1_laps (
    Year UInt16,
    GrandPrix String,
    SessionType String,
    SessionDate DateTime,
    Driver String,
    Team String,
    LapNumber UInt8,
    LapTime Float32,
    Sector1Time Float32,
    Sector2Time Float32,
    Sector3Time Float32,
    SpeedI1 Float32,
    SpeedI2 Float32,
    SpeedFL Float32,
    SpeedST Float32,
    IsPersonalBest Bool,
    Compound String,
    TyreLife UInt8
) ENGINE = MergeTree()
ORDER BY (Year, GrandPrix, SessionType, Driver, LapNumber)
""")

# Create telemetry table
client.command("""
CREATE TABLE f1_telemetry (
    Year UInt16,
    GrandPrix String,
    SessionType String,
    Driver String,
    LapNumber UInt8,
    Time Float32,
    Speed Float32,
    Throttle Float32,
    Brake Bool,
    nGear UInt8,
    DRS UInt8,
    RPM Float32
) ENGINE = MergeTree()
ORDER BY (Year, GrandPrix, SessionType, Driver, LapNumber, Time)
""")

# Insert data
if not laps_data.empty:
    print("\nInserting lap data into ClickHouse...")
    # Clean data before insertion
    laps_data = laps_data.fillna(0)
    laps_data['SessionDate'] = pd.to_datetime(laps_data['SessionDate'])

    client.insert_df('f1_laps', laps_data)
    print(f"Inserted {len(laps_data)} lap records")

if not telemetry_data.empty:
    print("\nInserting telemetry data into ClickHouse...")
    # Clean data before insertion
    telemetry_data = telemetry_data.fillna(0)
    telemetry_data['Brake'] = telemetry_data['Brake'].astype(bool)

    client.insert_df('f1_telemetry', telemetry_data)
    print(f"Inserted {len(telemetry_data)} telemetry records")

# Verify data
lap_count = client.query("SELECT count(*) FROM f1_laps").result_rows[0][0]
telemetry_count = client.query("SELECT count(*) FROM f1_telemetry").result_rows[0][0]
print(f"Total laps in database: {lap_count}")
print(f"Total telemetry records in database: {telemetry_count}")
```

## Query Data จาก ClickHouse

หลังจาก run เสร็จ เราจะ query data จาก ClickHouse กัน ผ่าน Web UI [http://localhost:8123/play](http://localhost:8123/play)

![ClickHouse Query](/assets/images/Pasted%20image%2020250914204803.png)

## สรุป

มาถึงตรงนี้เราสามารถ Load data เข้าไปใน ClickHouse ที่เป็น Data Warehouse ของเรากันได้แล้ว

ใน Blog นี้จะใช้ Claude Code ช่วยเขียน Code ในหลาย ๆ จุด โดยเฉพาะการ Comment ให้เข้าใจง่าย ๆ ครับ

Code ทั้งหมดจะอยู่ใน [GitHub repo](https://github.com/waice13/blog_20250914_1_clickhouse)

สำหรับการ Visualize Insight ต่าง ๆ เราจะมาต่อกันใน Blog ถัด ๆ ไปครับบ
