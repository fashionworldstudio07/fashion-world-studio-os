import sqlite3
from datetime import datetime, timezone

def test_queries():
    conn = sqlite3.connect("salon.db")
    cursor = conn.cursor()
    
    now = datetime.now(timezone.utc)
    print("Python now (UTC):", now)
    
    # 1. Check all service dates
    cursor.execute("SELECT id, service_date FROM transactions;")
    print("\nTransactions service dates in DB:")
    for row in cursor.fetchall():
        print(row)
        
    # 2. Let's see what happens if we query with simple strings
    print("\nQuerying where service_date >= '2026-06-01':")
    cursor.execute("SELECT count(*) FROM transactions WHERE service_date >= '2026-06-01';")
    print("Count:", cursor.fetchone()[0])
    
    # 3. Querying where service_date >= '2026-06-01 00:00:00'
    print("\nQuerying where service_date >= '2026-06-01 00:00:00':")
    cursor.execute("SELECT count(*) FROM transactions WHERE service_date >= '2026-06-01 00:00:00';")
    print("Count:", cursor.fetchone()[0])

    # 4. Check services for transactions
    print("\nTop services query result:")
    cursor.execute("""
        SELECT ts.service_name, COUNT(ts.id), SUM(ts.price)
        FROM transaction_services ts
        JOIN transactions t ON ts.transaction_id = t.id
        WHERE t.service_date >= '2026-06-01'
        GROUP BY ts.service_name;
    """)
    for row in cursor.fetchall():
        print(row)
        
    conn.close()

if __name__ == "__main__":
    test_queries()
