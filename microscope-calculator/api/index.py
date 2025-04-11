from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, template_folder='../templates')

def get_db_connection():
    
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    
    # Create tables and add some sample data
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        microscope_size REAL NOT NULL,
        magnification REAL NOT NULL,
        real_size REAL NOT NULL,
        timestamp TEXT NOT NULL
    )
    ''')
    
    # Add sample data (optional)
    cursor.execute('''
    INSERT INTO measurements (username, microscope_size, magnification, real_size, timestamp)
    VALUES (?, ?, ?, ?, ?)
    ''', ('sample_user', 100.0, 40.0, 2.5, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    
    conn.commit()
    return conn

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        microscope_size = float(request.form['microscope_size'])
        magnification = float(request.form['magnification'])
        
        if magnification <= 0:
            return jsonify({'error': 'Magnification must be greater than zero'}), 400
            
        real_size = microscope_size / magnification
        
        return jsonify({
            'microscope_size': microscope_size,
            'magnification': magnification,
            'real_size': real_size
        })
    except ValueError:
        return jsonify({'error': 'Please enter valid numbers'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save', methods=['POST'])
def save_measurement():
    try:
        data = request.get_json()
        username = data.get('username')
        microscope_size = float(data.get('microscope_size'))
        magnification = float(data.get('magnification'))
        real_size = float(data.get('real_size'))
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
            
        conn = get_db_connection()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn.execute('''
        INSERT INTO measurements (username, microscope_size, magnification, real_size, timestamp)
        VALUES (?, ?, ?, ?, ?)
        ''', (username, microscope_size, magnification, real_size, timestamp))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Measurement saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/measurements')
def get_measurements():
    try:
        conn = get_db_connection()
        measurements = conn.execute('SELECT * FROM measurements ORDER BY timestamp DESC').fetchall()
        conn.close()
        
        result = []
        for row in measurements:
            result.append({
                'id': row['id'],
                'username': row['username'],
                'microscope_size': row['microscope_size'],
                'magnification': row['magnification'],
                'real_size': row['real_size'],
                'timestamp': row['timestamp']
            })
            
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# For local development
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5050))
    app.run(host='0.0.0.0', port=port, debug=True)