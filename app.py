from flask import Flask, render_template, jsonify, request
import datetime
import sqlite3
import uuid

app = Flask(__name__)
DATABASE = 'kasir.db'

# ... (fungsi get_db_connection dan init_db tetap sama) ...
def get_db_connection():
    """Mendapatkan koneksi ke database SQLite."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row 
    return conn

def init_db():
    """Inisialisasi database dan membuat tabel jika belum ada."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS produk (
            id TEXT PRIMARY KEY,
            nama TEXT NOT NULL,
            harga INTEGER NOT NULL,
            stok INTEGER NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS histori_transaksi (
            id TEXT PRIMARY KEY,
            tanggal TEXT NOT NULL,
            total_belanja REAL NOT NULL,
            uang_bayar REAL NOT NULL,
            kembalian REAL NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS detail_transaksi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_transaksi TEXT NOT NULL,
            id_produk TEXT NOT NULL,
            nama_produk TEXT NOT NULL,
            harga_produk INTEGER NOT NULL,
            jumlah INTEGER NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (id_transaksi) REFERENCES histori_transaksi (id),
            FOREIGN KEY (id_produk) REFERENCES produk (id)
        )
    ''')
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM produk")
    if cursor.fetchone()['COUNT(*)'] == 0:
        initial_products = [
            (str(uuid.uuid4().hex), "Buku Tulis SIDU 38", 5000, 100), # Gunakan hex untuk ID lebih pendek jika diinginkan
            (str(uuid.uuid4().hex), "Pensil 2B Faber-Castell", 2500, 200),
            (str(uuid.uuid4().hex), "Penghapus Steadler", 1500, 150),
        ]
        cursor.executemany("INSERT INTO produk (id, nama, harga, stok) VALUES (?, ?, ?, ?)", initial_products)
        conn.commit()
    conn.close()

with app.app_context():
    init_db()

@app.route('/')
def index():
    """Menampilkan halaman utama kasir."""
    return render_template('index.html')

@app.route('/produk-admin') # ROUTE BARU
def produk_admin_page():
    """Menampilkan halaman manajemen produk."""
    return render_template('produk_manajemen.html')

# --- API Endpoints untuk Produk (tetap sama, digunakan oleh produk_script.js) ---
@app.route('/api/produk', methods=['GET'])
def get_semua_produk():
    conn = get_db_connection()
    produk_list = conn.execute('SELECT * FROM produk ORDER BY nama ASC').fetchall()
    conn.close()
    return jsonify([dict(p) for p in produk_list])

@app.route('/api/produk/<id_produk>', methods=['GET'])
def get_satu_produk(id_produk):
    conn = get_db_connection()
    produk = conn.execute('SELECT * FROM produk WHERE id = ?', (id_produk,)).fetchone()
    conn.close()
    if produk is None:
        return jsonify({"status": "error", "message": "Produk tidak ditemukan"}), 404
    return jsonify(dict(produk))

@app.route('/api/produk', methods=['POST'])
def tambah_produk():
    data = request.json
    nama = data.get('nama')
    harga = data.get('harga')
    stok = data.get('stok')

    if not nama or harga is None or stok is None:
        return jsonify({"status": "error", "message": "Data produk tidak lengkap"}), 400
    try:
        harga = int(harga)
        stok = int(stok)
        if harga < 0 or stok < 0:
            raise ValueError("Harga dan stok tidak boleh negatif")
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    
    produk_id = str(uuid.uuid4().hex) 

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO produk (id, nama, harga, stok) VALUES (?, ?, ?, ?)',
                     (produk_id, nama, harga, stok))
        conn.commit()
        new_product = conn.execute('SELECT * FROM produk WHERE id = ?', (produk_id,)).fetchone()
    except sqlite3.IntegrityError: 
        conn.close()
        return jsonify({"status": "error", "message": "Gagal menyimpan produk, mungkin ID sudah ada."}), 500
    finally:
        if conn: # Pastikan koneksi ditutup
            conn.close()
        
    return jsonify({"status": "success", "message": "Produk berhasil ditambahkan", "produk": dict(new_product)}), 201

@app.route('/api/produk/<id_produk>', methods=['PUT'])
def update_produk(id_produk):
    data = request.json
    nama = data.get('nama')
    harga = data.get('harga')
    stok = data.get('stok')

    if not nama or harga is None or stok is None:
        return jsonify({"status": "error", "message": "Data produk tidak lengkap"}), 400
    try:
        harga = int(harga)
        stok = int(stok)
        if harga < 0 or stok < 0:
            raise ValueError("Harga dan stok tidak boleh negatif")
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE produk SET nama = ?, harga = ?, stok = ? WHERE id = ?',
                 (nama, harga, stok, id_produk))
    conn.commit()
    
    updated_product = None # Inisialisasi
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"status": "error", "message": "Produk tidak ditemukan untuk diupdate"}), 404
    
    updated_product = conn.execute('SELECT * FROM produk WHERE id = ?', (id_produk,)).fetchone()
    conn.close()
    return jsonify({"status": "success", "message": "Produk berhasil diperbarui", "produk": dict(updated_product)})

@app.route('/api/produk/<id_produk>', methods=['DELETE'])
def hapus_produk(id_produk):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM produk WHERE id = ?', (id_produk,))
    conn.commit()
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"status": "error", "message": "Produk tidak ditemukan untuk dihapus"}), 404
        
    conn.close()
    return jsonify({"status": "success", "message": "Produk berhasil dihapus"})


# --- Transaksi (tetap sama) ---
@app.route('/api/transaksi', methods=['POST'])
def proses_transaksi():
    data_transaksi = request.json
    keranjang = data_transaksi.get('keranjang')
    total_belanja = data_transaksi.get('totalBelanja')
    uang_bayar = data_transaksi.get('uangBayar')

    if not keranjang or total_belanja is None or uang_bayar is None:
        return jsonify({"status": "error", "message": "Data transaksi tidak lengkap"}), 400

    try:
        total_belanja = float(total_belanja)
        uang_bayar = float(uang_bayar)
    except ValueError:
        return jsonify({"status": "error", "message": "Nilai numerik tidak valid"}), 400

    if uang_bayar < total_belanja:
        return jsonify({"status": "error", "message": f"Uang bayar kurang. Butuh Rp {total_belanja:,.0f}"}), 400

    kembalian = uang_bayar - total_belanja
    transaksi_id = f"TRX-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO histori_transaksi (id, tanggal, total_belanja, uang_bayar, kembalian)
            VALUES (?, ?, ?, ?, ?)
        ''', (transaksi_id, datetime.datetime.now().isoformat(), total_belanja, uang_bayar, kembalian))

        for item_keranjang in keranjang:
            id_produk_di_keranjang = item_keranjang['id']
            jumlah_dibeli = item_keranjang['jumlah']

            produk_db = cursor.execute('SELECT stok, nama, harga FROM produk WHERE id = ?', (id_produk_di_keranjang,)).fetchone()
            if produk_db is None:
                conn.rollback()
                conn.close()
                return jsonify({"status": "error", "message": f"Produk {item_keranjang['nama']} (ID: {id_produk_di_keranjang}) tidak ditemukan di database saat transaksi."}), 500
            
            if produk_db['stok'] < jumlah_dibeli:
                conn.rollback()
                conn.close()
                return jsonify({"status": "error", "message": f"Stok produk {item_keranjang['nama']} tidak mencukupi ({produk_db['stok']} tersedia, {jumlah_dibeli} diminta)."}), 400
            
            stok_baru = produk_db['stok'] - jumlah_dibeli
            cursor.execute('UPDATE produk SET stok = ? WHERE id = ?', (stok_baru, id_produk_di_keranjang))
            
            cursor.execute('''
                INSERT INTO detail_transaksi (id_transaksi, id_produk, nama_produk, harga_produk, jumlah, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (transaksi_id, id_produk_di_keranjang, item_keranjang['nama'], item_keranjang['harga'], jumlah_dibeli, item_keranjang['subtotal']))

        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()
    
    data_struk = {
        "id": transaksi_id,
        "tanggal": datetime.datetime.now().isoformat(),
        "item": keranjang,
        "total_belanja": total_belanja,
        "uang_bayar": uang_bayar,
        "kembalian": kembalian
    }

    return jsonify({
        "status": "success",
        "message": "Transaksi berhasil diproses!",
        "data_struk": data_struk
    })

if __name__ == '__main__':
    app.run(debug=True)