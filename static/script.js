document.addEventListener( 'DOMContentLoaded', () =>
{
    // Variabel DOM yang ada sebelumnya
    const produkListDiv = document.getElementById( 'produk-list' );
    const isiKeranjangTbody = document.getElementById( 'isi-keranjang' );
    const totalBelanjaSpan = document.getElementById( 'total-belanja' );
    const uangBayarInput = document.getElementById( 'uang-bayar' );
    const tombolBayar = document.getElementById( 'tombol-bayar' );
    const modalStruk = document.getElementById( 'modal-struk' );
    const detailStrukDiv = document.getElementById( 'detail-struk' );
    const closeButton = document.querySelector( '.close-button' );
    const tombolCetakStruk = document.getElementById( 'tombol-cetak-struk' );
    const tombolTransaksiBaru = document.getElementById( 'tombol-transaksi-baru' );

    // Variabel DOM Baru untuk CRUD Produk
    const formProduk = document.getElementById( 'form-produk' );
    const produkIdInput = document.getElementById( 'produk-id' );
    const produkNamaInput = document.getElementById( 'produk-nama' );
    const produkHargaInput = document.getElementById( 'produk-harga' );
    const produkStokInput = document.getElementById( 'produk-stok' );
    const tombolSimpanProduk = document.getElementById( 'tombol-simpan-produk' );
    const tombolResetForm = document.getElementById( 'tombol-reset-form' );

    let keranjang = [];
    let daftarProdukCache = []; // Cache untuk produk yang diambil dari backend

    // Fungsi format Rupiah (sama seperti sebelumnya)
    function formatRupiah ( angka )
    {
        return new Intl.NumberFormat( 'id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 } ).format( angka );
    }

    // --- Fungsi CRUD Produk ---

    async function muatProduk ()
    {
        try
        {
            const response = await fetch( '/api/produk' );
            if ( !response.ok ) throw new Error( `HTTP error! status: ${ response.status }` );
            daftarProdukCache = await response.json();

            produkListDiv.innerHTML = '';
            if ( daftarProdukCache.length === 0 )
            {
                produkListDiv.innerHTML = "<p>Belum ada produk.</p>";
                return;
            }

            daftarProdukCache.forEach( produk =>
            {
                const produkDiv = document.createElement( 'div' );
                produkDiv.classList.add( 'produk-item' );
                produkDiv.dataset.produkId = produk.id; // Simpan ID produk di elemen
                produkDiv.innerHTML = `
                    <h3>${ produk.nama }</h3>
                    <p class="harga">${ formatRupiah( produk.harga ) }</p>
                    <p>Stok: <span id="stok-${ produk.id }">${ produk.stok }</span></p>
                    <div class="produk-actions">
                        <button data-id="${ produk.id }" class="tambah-ke-keranjang" ${ produk.stok === 0 ? 'disabled' : '' }>
                            ${ produk.stok === 0 ? 'Habis' : 'Tambah' }
                        </button>
                        <button data-id="${ produk.id }" class="edit-produk">Edit</button>
                        <button data-id="${ produk.id }" class="hapus-produk">Hapus</button>
                    </div>
                `;
                produkListDiv.appendChild( produkDiv );
            } );
        } catch ( error )
        {
            console.error( "Gagal memuat produk:", error );
            produkListDiv.innerHTML = "<p>Gagal memuat produk. Coba lagi nanti.</p>";
        }
    }

    function resetFormProduk ()
    {
        formProduk.reset();
        produkIdInput.value = ''; // Pastikan ID tersembunyi juga direset
        tombolSimpanProduk.textContent = 'Simpan Produk';
        tombolResetForm.style.display = 'none';
    }

    formProduk.addEventListener( 'submit', async ( e ) =>
    {
        e.preventDefault();
        const idProduk = produkIdInput.value;
        const nama = produkNamaInput.value;
        const harga = parseFloat( produkHargaInput.value );
        const stok = parseInt( produkStokInput.value );

        if ( !nama || isNaN( harga ) || isNaN( stok ) || harga < 0 || stok < 0 )
        {
            alert( 'Pastikan semua field produk terisi dengan benar (harga dan stok tidak boleh negatif).' );
            return;
        }

        const produkData = { nama, harga, stok };
        let url = '/api/produk';
        let method = 'POST';

        if ( idProduk )
        { // Jika ada ID, berarti mode edit
            url = `/api/produk/${ idProduk }`;
            method = 'PUT';
        }

        try
        {
            const response = await fetch( url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( produkData )
            } );
            const hasil = await response.json();

            if ( response.ok && hasil.status === 'success' )
            {
                alert( hasil.message );
                resetFormProduk();
                muatProduk(); // Muat ulang daftar produk
            } else
            {
                alert( `Error: ${ hasil.message || 'Gagal menyimpan produk.' }` );
            }
        } catch ( error )
        {
            console.error( "Error saat menyimpan produk:", error );
            alert( "Terjadi kesalahan pada server saat menyimpan produk." );
        }
    } );

    tombolResetForm.addEventListener( 'click', () =>
    {
        resetFormProduk();
    } );

    // Event delegation untuk tombol Edit dan Hapus pada produk
    produkListDiv.addEventListener( 'click', async ( e ) =>
    {
        const target = e.target;
        const produkId = target.dataset.id;

        if ( target.classList.contains( 'edit-produk' ) )
        {
            const produkUntukEdit = daftarProdukCache.find( p => p.id === produkId );
            if ( produkUntukEdit )
            {
                produkIdInput.value = produkUntukEdit.id;
                produkNamaInput.value = produkUntukEdit.nama;
                produkHargaInput.value = produkUntukEdit.harga;
                produkStokInput.value = produkUntukEdit.stok;
                tombolSimpanProduk.textContent = 'Update Produk';
                tombolResetForm.style.display = 'inline-block';
                // Scroll ke form edit untuk UX yang lebih baik
                formProduk.scrollIntoView( { behavior: 'smooth' } );
            }
        } else if ( target.classList.contains( 'hapus-produk' ) )
        {
            if ( confirm( `Apakah Anda yakin ingin menghapus produk ini?` ) )
            {
                try
                {
                    const response = await fetch( `/api/produk/${ produkId }`, { method: 'DELETE' } );
                    const hasil = await response.json();
                    if ( response.ok && hasil.status === 'success' )
                    {
                        alert( hasil.message );
                        muatProduk(); // Muat ulang daftar produk
                        // Hapus juga dari keranjang jika ada
                        keranjang = keranjang.filter( item => item.id !== produkId );
                        renderKeranjang();
                    } else
                    {
                        alert( `Error: ${ hasil.message || 'Gagal menghapus produk.' }` );
                    }
                } catch ( error )
                {
                    console.error( "Error saat menghapus produk:", error );
                    alert( "Terjadi kesalahan pada server saat menghapus produk." );
                }
            }
        } else if ( target.classList.contains( 'tambah-ke-keranjang' ) )
        {
            // Logika tambah ke keranjang (disesuaikan sedikit)
            const produkDitambahkan = daftarProdukCache.find( p => p.id === produkId );

            if ( !produkDitambahkan ) return;

            const stokProdukSaatIni = parseInt( document.getElementById( `stok-${ produkId }` ).textContent );

            if ( stokProdukSaatIni <= 0 )
            {
                alert( 'Stok produk habis!' );
                return;
            }

            const itemDiKeranjang = keranjang.find( item => item.id === produkId );

            if ( itemDiKeranjang )
            {
                // Cek apakah jumlah di keranjang + 1 melebihi stok yang tersedia
                if ( ( itemDiKeranjang.jumlah + 1 ) <= stokProdukSaatIni )
                {
                    itemDiKeranjang.jumlah++;
                    itemDiKeranjang.subtotal = itemDiKeranjang.harga * itemDiKeranjang.jumlah;
                } else
                {
                    alert( 'Stok tidak mencukupi untuk menambah jumlah item ini ke keranjang.' );
                    return;
                }
            } else
            {
                keranjang.push( {
                    id: produkDitambahkan.id,
                    nama: produkDitambahkan.nama,
                    harga: produkDitambahkan.harga,
                    jumlah: 1,
                    subtotal: produkDitambahkan.harga
                } );
            }
            renderKeranjang();
        }
    } );

    // --- Fungsi Keranjang dan Transaksi (Sebagian besar sama, sedikit penyesuaian) ---

    function renderKeranjang ()
    {
        isiKeranjangTbody.innerHTML = '';
        let totalKeseluruhan = 0;

        if ( keranjang.length === 0 )
        {
            isiKeranjangTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Keranjang kosong</td></tr>';
        } else
        {
            keranjang.forEach( ( item, index ) =>
            {
                const tr = document.createElement( 'tr' );
                tr.innerHTML = `
                    <td>${ item.nama }</td>
                    <td>${ formatRupiah( item.harga ) }</td>
                    <td>
                        <button class="kurang-item" data-index="${ index }">-</button>
                        ${ item.jumlah }
                        <button class="tambah-item-di-keranjang" data-index="${ index }">+</button>
                    </td>
                    <td>${ formatRupiah( item.subtotal ) }</td>
                    <td><button class="hapus-item-keranjang" data-index="${ index }">Hapus</button></td>
                `; // Ubah class tombol hapus item keranjang
                isiKeranjangTbody.appendChild( tr );
                totalKeseluruhan += item.subtotal;
            } );
        }
        totalBelanjaSpan.textContent = formatRupiah( totalKeseluruhan );
    }

    isiKeranjangTbody.addEventListener( 'click', ( e ) =>
    {
        const index = parseInt( e.target.dataset.index );
        if ( isNaN( index ) || index < 0 || index >= keranjang.length ) return; // Pastikan index valid

        const produkDiKeranjang = keranjang[ index ];
        const produkAsliDariCache = daftarProdukCache.find( p => p.id === produkDiKeranjang.id );
        // Ambil stok terbaru dari tampilan (yang sudah diupdate dari DB)
        const stokProdukSaatIni = produkAsliDariCache ? parseInt( document.getElementById( `stok-${ produkAsliDariCache.id }` ).textContent ) : 0;


        if ( e.target.classList.contains( 'hapus-item-keranjang' ) )
        { // Sesuaikan dengan class baru
            keranjang.splice( index, 1 );
        } else if ( e.target.classList.contains( 'tambah-item-di-keranjang' ) )
        {
            if ( produkAsliDariCache && ( produkDiKeranjang.jumlah + 1 ) <= stokProdukSaatIni )
            {
                produkDiKeranjang.jumlah++;
                produkDiKeranjang.subtotal = produkDiKeranjang.harga * produkDiKeranjang.jumlah;
            } else
            {
                alert( 'Stok tidak mencukupi untuk menambah jumlah item ini.' );
            }
        } else if ( e.target.classList.contains( 'kurang-item' ) )
        {
            if ( produkDiKeranjang.jumlah > 1 )
            {
                produkDiKeranjang.jumlah--;
                produkDiKeranjang.subtotal = produkDiKeranjang.harga * produkDiKeranjang.jumlah;
            } else
            {
                keranjang.splice( index, 1 );
            }
        }
        renderKeranjang();
    } );

    tombolBayar.addEventListener( 'click', async () =>
    {
        const totalBelanja = keranjang.reduce( ( sum, item ) => sum + item.subtotal, 0 );
        const uangBayar = parseFloat( uangBayarInput.value );

        if ( keranjang.length === 0 )
        {
            alert( "Keranjang belanja kosong!" );
            return;
        }
        if ( isNaN( uangBayar ) || uangBayar <= 0 )
        {
            alert( "Masukkan jumlah uang bayar yang valid!" );
            return;
        }
        if ( uangBayar < totalBelanja )
        {
            alert( `Uang bayar kurang! Total belanja adalah ${ formatRupiah( totalBelanja ) }` );
            return;
        }

        try
        {
            const response = await fetch( '/api/transaksi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( {
                    keranjang: keranjang,
                    totalBelanja: totalBelanja,
                    uangBayar: uangBayar
                } )
            } );
            const hasil = await response.json();

            if ( response.ok && hasil.status === 'success' )
            {
                tampilkanStruk( hasil.data_struk );
                keranjang = [];
                uangBayarInput.value = '';
                renderKeranjang();
                muatProduk(); // Muat ulang produk untuk update stok dari backend
            } else
            {
                alert( `Error: ${ hasil.message || 'Gagal memproses transaksi.' }` );
            }
        } catch ( error )
        {
            console.error( "Error saat transaksi:", error );
            alert( "Terjadi kesalahan saat menghubungi server untuk transaksi." );
        }
    } );

    // Fungsi tampilkanStruk, closeButton, tombolCetakStruk, tombolTransaksiBaru, dan klik di luar modal
    // (Sama seperti sebelumnya, tidak perlu diubah)
    function tampilkanStruk ( dataStruk )
    {
        let itemStrukHtml = '';
        dataStruk.item.forEach( item =>
        {
            itemStrukHtml += `<p>${ item.nama } (${ item.jumlah } x ${ formatRupiah( item.harga ) }) = ${ formatRupiah( item.subtotal ) }</p>`;
        } );

        detailStrukDiv.innerHTML = `
            <p><strong>ID Transaksi:</strong> ${ dataStruk.id }</p>
            <p><strong>Tanggal:</strong> ${ new Date( dataStruk.tanggal ).toLocaleString( 'id-ID' ) }</p>
            <hr>
            ${ itemStrukHtml }
            <hr>
            <p><strong>Total Belanja:</strong> ${ formatRupiah( dataStruk.total_belanja ) }</p>
            <p><strong>Uang Bayar:</strong> ${ formatRupiah( dataStruk.uang_bayar ) }</p>
            <p><strong>Kembalian:</strong> ${ formatRupiah( dataStruk.kembalian ) }</p>
            <hr>
            <p style="text-align:center;">--- Terima Kasih ---</p>
        `;
        modalStruk.style.display = 'block';
    }

    closeButton.addEventListener( 'click', () => modalStruk.style.display = 'none' );
    tombolCetakStruk.addEventListener( 'click', () => alert( "Struk 'dicetak' (simulasi)." ) );
    tombolTransaksiBaru.addEventListener( 'click', () => modalStruk.style.display = 'none' );
    window.addEventListener( 'click', ( event ) =>
    {
        if ( event.target == modalStruk ) modalStruk.style.display = 'none';
    } );

    // Inisialisasi awal
    muatProduk();
    renderKeranjang();
} );