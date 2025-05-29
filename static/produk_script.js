document.addEventListener( 'DOMContentLoaded', () =>
{
    const formProdukAdmin = document.getElementById( 'form-produk-admin' );
    const produkIdInputAdmin = document.getElementById( 'produk-id-admin' );
    const produkNamaInputAdmin = document.getElementById( 'produk-nama-admin' );
    const produkHargaInputAdmin = document.getElementById( 'produk-harga-admin' );
    const produkStokInputAdmin = document.getElementById( 'produk-stok-admin' );
    const tombolSimpanProdukAdmin = document.getElementById( 'tombol-simpan-produk-admin' );
    const tombolResetFormAdmin = document.getElementById( 'tombol-reset-form-admin' );
    const isiTabelProdukTbody = document.getElementById( 'isi-tabel-produk' );

    // Fungsi untuk memformat angka menjadi format Rupiah
    function formatRupiah ( angka )
    {
        return new Intl.NumberFormat( 'id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 } ).format( angka );
    }

    // Fungsi untuk memuat dan menampilkan produk di tabel
    async function muatDanTampilkanProdukAdmin ()
    {
        try
        {
            const response = await fetch( '/api/produk' );
            if ( !response.ok ) throw new Error( `HTTP error! status: ${ response.status }` );
            const daftarProduk = await response.json();

            isiTabelProdukTbody.innerHTML = ''; // Kosongkan tabel sebelum memuat
            if ( daftarProduk.length === 0 )
            {
                isiTabelProdukTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada produk.</td></tr>';
                return;
            }

            daftarProduk.forEach( produk =>
            {
                const tr = document.createElement( 'tr' );
                tr.innerHTML = `
                    <td>${ produk.id.substring( 0, 8 ) }...</td>
                    <td>${ produk.nama }</td>
                    <td>${ formatRupiah( produk.harga ) }</td>
                    <td>${ produk.stok }</td>
                    <td>
                        <button class="edit-produk-admin" data-id="${ produk.id }">Edit</button>
                        <button class="hapus-produk-admin" data-id="${ produk.id }">Hapus</button>
                    </td>
                `;
                isiTabelProdukTbody.appendChild( tr );
            } );
        } catch ( error )
        {
            console.error( "Gagal memuat produk untuk admin:", error );
            isiTabelProdukTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Gagal memuat produk.</td></tr>';
        }
    }

    // Fungsi untuk mereset form produk admin
    function resetFormProdukAdmin ()
    {
        formProdukAdmin.reset();
        produkIdInputAdmin.value = '';
        tombolSimpanProdukAdmin.textContent = 'Simpan Produk';
        tombolResetFormAdmin.style.display = 'none';
    }

    // Event listener untuk submit form (Tambah/Update Produk)
    formProdukAdmin.addEventListener( 'submit', async ( e ) =>
    {
        e.preventDefault();
        const idProduk = produkIdInputAdmin.value;
        const nama = produkNamaInputAdmin.value;
        const harga = parseFloat( produkHargaInputAdmin.value );
        const stok = parseInt( produkStokInputAdmin.value );

        if ( !nama || isNaN( harga ) || isNaN( stok ) || harga < 0 || stok < 0 )
        {
            alert( 'Pastikan semua field produk terisi dengan benar (harga dan stok tidak boleh negatif).' );
            return;
        }

        const produkData = { nama, harga, stok };
        let url = '/api/produk';
        let method = 'POST';

        if ( idProduk )
        { // Mode Edit
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
                resetFormProdukAdmin();
                muatDanTampilkanProdukAdmin();
            } else
            {
                alert( `Error: ${ hasil.message || 'Gagal menyimpan produk.' }` );
            }
        } catch ( error )
        {
            console.error( "Error saat menyimpan produk (admin):", error );
            alert( "Terjadi kesalahan pada server saat menyimpan produk." );
        }
    } );

    // Event listener untuk tombol Batal Edit
    tombolResetFormAdmin.addEventListener( 'click', () =>
    {
        resetFormProdukAdmin();
    } );

    // Event delegation untuk tombol Edit dan Hapus di tabel produk
    isiTabelProdukTbody.addEventListener( 'click', async ( e ) =>
    {
        const target = e.target;
        const produkId = target.dataset.id;

        if ( target.classList.contains( 'edit-produk-admin' ) )
        {
            // Ambil data produk untuk di-edit (bisa dari cache atau fetch ulang)
            try
            {
                const response = await fetch( `/api/produk/${ produkId }` );
                if ( !response.ok ) throw new Error( 'Gagal mengambil data produk untuk diedit.' );
                const produkUntukEdit = await response.json();

                produkIdInputAdmin.value = produkUntukEdit.id;
                produkNamaInputAdmin.value = produkUntukEdit.nama;
                produkHargaInputAdmin.value = produkUntukEdit.harga;
                produkStokInputAdmin.value = produkUntukEdit.stok;
                tombolSimpanProdukAdmin.textContent = 'Update Produk';
                tombolResetFormAdmin.style.display = 'inline-block';
                formProdukAdmin.scrollIntoView( { behavior: 'smooth' } );

            } catch ( error )
            {
                console.error( "Error mengambil produk untuk diedit:", error );
                alert( "Gagal memuat data produk untuk diedit." );
            }

        } else if ( target.classList.contains( 'hapus-produk-admin' ) )
        {
            if ( confirm( `Apakah Anda yakin ingin menghapus produk dengan ID: ${ produkId.substring( 0, 8 ) }...?` ) )
            {
                try
                {
                    const response = await fetch( `/api/produk/${ produkId }`, { method: 'DELETE' } );
                    const hasil = await response.json();
                    if ( response.ok && hasil.status === 'success' )
                    {
                        alert( hasil.message );
                        muatDanTampilkanProdukAdmin();
                    } else
                    {
                        alert( `Error: ${ hasil.message || 'Gagal menghapus produk.' }` );
                    }
                } catch ( error )
                {
                    console.error( "Error saat menghapus produk (admin):", error );
                    alert( "Terjadi kesalahan pada server saat menghapus produk." );
                }
            }
        }
    } );

    // Muat produk saat halaman admin pertama kali dibuka
    muatDanTampilkanProdukAdmin();
} );