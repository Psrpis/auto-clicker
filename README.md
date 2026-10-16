# auto-clicker

Sekmeye geçince seçtiğin resme otomatik tıklayan, indirme gerçekten başlayıp bittiyse sekmeyi kapatan tarayıcı eklentisi (Manifest V3). Helium, Chrome ve diğer Chromium tarayıcılarda çalışır. Tampermonkey gerekmez.

## Açma ve kapatma

Eklenti kurulduğunda kapalıdır. Kapalıyken sayfalarda panel görünmez ve hiçbir şey tıklanmaz.

- Araç çubuğundaki eklenti simgesine tıklayınca açılır ya da kapanır. Simgenin üstünde ON veya OFF yazar.
- Panelin sağ üstündeki × düğmesi de eklentiyi kapatır. Tekrar açmak için simgeye tıkla.
- − düğmesi paneli sadece küçültür.
- Simge görünmüyorsa tarayıcının eklentiler menüsünden eklentiyi araç çubuğuna sabitle.

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
- icons: araç çubuğu simgeleri
- content.js: panel, resim seçme ve tıklama
- background.js: indirme takibi ve sekme kapatma
- legacy-auto-clicker.user.js: eski Tampermonkey sürümü (2.7), yedek olarak duruyor

## Notlar

- Eklenti ve eski Tampermonkey script'ini aynı anda açık tutma, iki panel çıkar.
- Aynı anda birden fazla sekme indirme başlatırsa eşleştirme önce indirmenin geldiği sayfa adresine, sonra resim adresine, en son sıraya göre yapılır.
