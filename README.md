# auto-clicker

Sekmeye geçince seçtiğin resme otomatik tıklayan, indirme gerçekten başlayıp bittiyse sekmeyi kapatan tarayıcı eklentisi (Manifest V3). Helium, Chrome ve diğer Chromium tarayıcılarda çalışır. Tampermonkey gerekmez.

## Nasıl çalışır

1. Sayfadaki panelden "Sayfadan Resim Seç" ile resmi bir kere seçersin.
2. "Oto-Tıklamayı Başlat" ile açarsın.
3. Bundan sonra açılan her sekmeye geçtiğinde eklenti resmi bulup tıklar.
4. Arka plan servisi tarayıcının indirme olayını dinler. İndirme başlayıp tamamlanırsa o sekmeyi kapatır.
5. 10 saniye içinde indirme başlamazsa ya da indirme yarıda kesilirse sekme kapatılmaz. Panelde uyarı görünür.

Kapatma işi sayfadaki scriptte değil arka plan servisinde yapıldığı için sayfa yenilense, yönlenise ya da script ölse bile çalışır.

## Kurulum (Helium)

1. Bu depoyu indir ya da klonla.
2. helium://extensions adresini aç (olmazsa chrome://extensions).
3. Geliştirici modunu aç.
4. "Paketlenmemiş öğe yükle" ile depo klasörünü seç.
5. Kodu değiştirirsen eklentiler sayfasından yenile.

## Dosyalar

- manifest.json: eklenti tanımı
- content.js: panel, resim seçme ve tıklama
- background.js: indirme takibi ve sekme kapatma
- legacy-auto-clicker.user.js: eski Tampermonkey sürümü (2.7), yedek olarak duruyor

## Notlar

- Eklenti ve eski Tampermonkey script'ini aynı anda açık tutma, iki panel çıkar.
- Aynı anda birden fazla sekme indirme başlatırsa eşleştirme önce indirmenin geldiği sayfa adresine, sonra resim adresine, en son sıraya göre yapılır.
