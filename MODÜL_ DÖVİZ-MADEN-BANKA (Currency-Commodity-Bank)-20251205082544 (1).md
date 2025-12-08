# MODÜL: DÖVİZ-MADEN-BANKA (Currency-Commodity-Bank)

## Genel Tanım

Döviz-Maden-Banka modülü, serbest piyasa ve banka bazlı döviz/maden kurlarının çekilmesi, saklanması ve sunulmasını yönetir. Veriler [canlidoviz.com](http://canlidoviz.com) üzerinden scraper aracılığıyla dakikalık olarak çekilir ve veritabanında güncellenir. Kullanıcılar anlık kurları görüntüleyebilir, döviz/maden çevirisi yapabilir ve banka bazlı karşılaştırma yapabilir.

---

## Alt Modüller ve Tanımları

### 2.1 Döviz Yönetimi (Currency Management)

- **Tanım:** Döviz tanımları ve bilgileri
- **Ne Yapar:** Desteklenen dövizlerin kod, isim, bayrak bilgilerini tutar

### 2.2 Maden Yönetimi (Commodity Management)

- **Tanım:** Kıymetli maden tanımları ve bilgileri
- **Ne Yapar:** Desteklenen madenlerin kod, isim, logo bilgilerini tutar

### 2.3 Banka Yönetimi (Bank Management)

- **Tanım:** Banka tanımları ve bilgileri
- **Ne Yapar:** Desteklenen bankaların kod, isim, logo bilgilerini tutar

### 2.4 Serbest Piyasa Kurları (Free Market Rates)

- **Tanım:** Serbest piyasa fiyatları
- **Ne Yapar:** Anlık serbest piyasa alış/satış fiyatlarını tutar ve günceller

### 2.5 Banka Kurları (Bank Rates)

- **Tanım:** Banka bazlı döviz/maden fiyatları
- **Ne Yapar:** Her banka için ayrı alış/satış fiyatlarını tutar ve günceller

### 2.6 Scraper Servisi (Scraper Service)

- **Tanım:** Veri çekme servisi
- **Ne Yapar:** [canlidoviz.com](http://canlidoviz.com)'dan dakikalık veri çeker ve veritabanını günceller

### 2.7 Döviz Çevirici (Currency Converter)

- **Tanım:** Döviz/maden çevirme hesaplaması
- **Ne Yapar:** Girilen tutarı serbest piyasa veya banka kurlarına göre hesaplar

### 2.8 Öneriler (Recommendations)

- **Tanım:** Anasayfa öneri listesi
- **Ne Yapar:** Statik öneri listesini kullanıcının takip durumuna göre filtreler

---

## İşlevler (Fonksiyonlar)

### 2.1 - Döviz Listesi Getirme (Get Currencies)

**Giriş (Input):**

- Yok (tüm liste döner)
  **Çıkış (Output):**
- currencies: array
  _ currency_code: string - Para birimi kodu (örn: "USD")
  _ currency_name: string - Para birimi adı (örn: "Amerikan Doları") \* flag_url: string - Bayrak görseli URL'i
  **Akış:**

1. Frontend döviz listesini ister
2. Veritabanından aktif dövizler çekilir
3. Kod, isim ve bayrak bilgileri döner
   **Kurallar/Kısıtlar:**

- Desteklenen dövizler: USD, EUR, GBP, CHF, CAD, RUB, AED, AUD, DKK, SEK, NOK, JPY, KWD
- Liste ileride genişleyebilir
- Bayrak görselleri backend'den sunulur

---

### 2.2 - Maden Listesi Getirme (Get Commodities)

**Giriş (Input):**

- Yok (tüm liste döner)
  **Çıkış (Output):**
- commodities: array
  _ commodity_code: string - Maden kodu (örn: "GRAM_GOLD")
  _ commodity_name: string - Maden adı (örn: "Gram Altın") \* logo_url: string - Logo görseli URL'i
  **Akış:**

1. Frontend maden listesini ister
2. Veritabanından aktif madenler çekilir
3. Kod, isim ve logo bilgileri döner
   **Kurallar/Kısıtlar:**

- Desteklenen madenler: Gram Altın, Ons, Çeyrek, Yarım, Tam, Cumhuriyet, Gremse, Has, Gümüş
- Liste ileride genişleyebilir
- Logo görselleri backend'den sunulur

---

### 2.3 - Banka Listesi Getirme (Get Banks)

**Giriş (Input):**

- Yok (tüm liste döner)
  **Çıkış (Output):**
- banks: array
  _ bank_code: string - Banka kodu (örn: "ZIRAAT")
  _ bank_name: string - Banka adı (örn: "Ziraat Bankası") \* logo_url: string - Logo görseli URL'i
  **Akış:**

1. Frontend banka listesini ister
2. Veritabanından aktif bankalar çekilir
3. Kod, isim ve logo bilgileri döner
   **Kurallar/Kısıtlar:**

- Desteklenen bankalar: Kapalı Çarşı, Akbank, Albaraka, Denizbank, Enpara, Fibabanka, QNB Finansbank, Garanti Bankası, Halkbank, HSBC, ING Bank, İş Bankası, Kuveyt Türk, Merkez Bankası, Şekerbank, TEB, Vakıfbank, Yapı Kredi, Ziraat Bankası
- Logo görselleri backend'den sunulur
- Yeni banka eklemesi admin tarafından yapılır

---

### 2.4 - Serbest Piyasa Kurları Getirme (Get Free Market Rates)

**Giriş (Input):**

- type: string (opsiyonel) - Filtre ("currency" | "commodity" | null için hepsi)
- code: string (opsiyonel) - Belirli bir döviz/maden kodu
- search: string (opsiyonel) - Arama terimi (isim veya kod içinde arar)
- device_id: string (opsiyonel) - Takip durumu için cihaz kimliği
  **Çıkış (Output):**
- rates: array
  _ code: string - Döviz/Maden kodu
  _ name: string - Döviz/Maden adı
  _ logo_url: string - Bayrak/Logo URL'i
  _ type: string - Tip ("currency" | "commodity")
  _ buying_price: decimal - Alış fiyatı
  _ selling_price: decimal - Satış fiyatı
  _ daily_change: decimal - Günlük değişim (TL)
  _ daily_change_percentage: decimal - Günlük değişim (%)
  _ daily_change_status: string - Değişim durumu ("up" | "down" | "stable")
  _ last_updated: datetime - Son güncelleme zamanı \* is_followed: boolean - Takip durumu (device_id verilmişse)
  **Akış:**

1. Frontend serbest piyasa kurlarını ister
2. Eğer type parametresi varsa, ilgili tipe göre filtrelenir
3. Eğer search parametresi varsa, isim veya kod içinde arama yapılır
4. Eğer device_id verilmişse, her item için takip durumu kontrol edilir
5. Veritabanından güncel kurlar çekilir
6. Günlük değişim hesaplanır (bir önceki gün kapanışa göre)
7. Veriler döner
   **Kurallar/Kısıtlar:**

- Current Price = Selling Price olarak kabul edilir
- Günlük değişim bir önceki günün kapanış fiyatına göre hesaplanır
- daily_change_status: pozitif ise "up", negatif ise "down", sıfır ise "stable"
- Piyasa kapalıyken son kapanış fiyatları gösterilir
- search: Case-insensitive, isim veya kod içinde partial match
- search en az 2 karakter olmalı
- device_id verilmezse is_followed dönmez

---

### 2.5 - Banka Kurları Getirme (Get Bank Rates)

**Giriş (Input):**

- code: string - Döviz/Maden kodu (zorunlu)
- type: string - Tip ("currency" | "commodity")
- transaction_type: string - İşlem tipi ("buy" | "sell")
  **Çıkış (Output):**
- item_info: object
  - code: string - Döviz/Maden kodu
  - name: string - Döviz/Maden adı
  - logo_url: string - Bayrak/Logo URL'i
- bank_rates: array
  - bank_code: string - Banka kodu
  - bank_name: string - Banka adı
  - bank_logo_url: string - Banka logosu URL'i
  - price: decimal - İlgili fiyat (buy ise selling_price, sell ise buying_price)
  - last_updated: datetime - Son güncelleme zamanı
- best_rate: object - En iyi oranı veren banka bilgisi
  _ bank_code: string
  _ bank_name: string \* price: decimal
  **Akış:**

1. Kullanıcı çeviri detay sayfasında banka kurlarını görüntüler
2. Döviz/maden kodu ve işlem tipi ile istek atılır
3. İlgili döviz/maden için kur sağlayan bankalar çekilir
4. İşlem tipine göre sıralanır:
   - "buy" (almak istiyorum): selling_price'a göre artan (en düşük en üstte)
   - "sell" (satmak istiyorum): buying_price'a göre azalan (en yüksek en üstte)
5. En iyi oran işaretlenir
6. Veriler döner
   **Kurallar/Kısıtlar:**

- Almak istiyorum: Bankanın satış fiyatı gösterilir (selling_price)
- Satmak istiyorum: Bankanın alış fiyatı gösterilir (buying_price)
- En iyi oran: Almak için en düşük satış, satmak için en yüksek alış
- Banka ilgili döviz/maden için kur sağlamıyorsa listede gösterilmez
- Premium özellik (Paywall arkasında)

---

### 2.6 - Tek Banka Detay Getirme (Get Single Bank Rate Detail)

**Giriş (Input):**

- code: string - Döviz/Maden kodu
- type: string - Tip ("currency" | "commodity")
- bank_code: string - Banka kodu
  **Çıkış (Output):**
- item_info: object
  - code: string - Döviz/Maden kodu
  - name: string - Döviz/Maden adı
- bank_info: object
  - bank_code: string - Banka kodu
  - bank_name: string - Banka adı
  - bank_logo_url: string - Banka logosu
- rates: object
  _ buying_price: decimal - Alış fiyatı
  _ selling_price: decimal - Satış fiyatı
  _ daily_change: decimal - Günlük değişim (TL)
  _ daily_change_percentage: decimal - Günlük değişim (%) \* last_updated: datetime - Son güncelleme
  **Akış:**

1. Kullanıcı banka listesinden bir bankaya tıklar
2. Pop-up için detay bilgisi istenir
3. İlgili banka ve döviz/maden için detaylar döner
   **Kurallar/Kısıtlar:**

- Premium özellik (Paywall arkasında)

---

### 2.7 - Scraper Servisi (Scraper Service)

**Giriş (Input):**

- Otomatik tetiklenir (cron job)
  **Çıkış (Output):**
- Veritabanı güncellenir
- Log kaydı oluşturulur
  **Akış:**

1. Dakikalık cron job tetiklenir
2. [canlidoviz.com](http://canlidoviz.com)'a istek atılır
3. Serbest piyasa kurları parse edilir
4. Banka kurları parse edilir
5. Veritabanındaki ilgili kayıtlar güncellenir
6. Son kapanış fiyatı kaydedilir (günlük değişim hesabı için)
7. Piyasa durumu güncellenir (açık/kapalı)
8. İşlem logu kaydedilir
   **Kurallar/Kısıtlar:**

- Çalışma sıklığı: Dakikalık
- Veri kaynağı: [canlidoviz.com](http://canlidoviz.com)
- Piyasa kapalıyken kapanış fiyatları korunur
- Hata durumunda retry mekanizması olmalı
- Son başarılı güncelleme zamanı tutulmalı

---

### 2.8 - Döviz Çevirici Hesaplama (Currency Converter Calculate)

**Giriş (Input):**

- from_code: string - Kaynak döviz/maden kodu
- from_type: string - Kaynak tipi ("currency" | "commodity")
- to_code: string - Hedef para birimi (şimdilik sadece "TRY")
- amount: decimal - Miktar
- transaction_type: string - İşlem tipi ("buy" | "sell")
  **Çıkış (Output):**
- free_market_result: object
  - rate: decimal - Kullanılan kur
  - result: decimal - Sonuç (TL)
- bank_results: array (premium kullanıcılar için)
  _ bank_code: string
  _ bank_name: string
  _ bank_logo_url: string
  _ rate: decimal \* result: decimal
  **Akış:**

1. Kullanıcı miktar ve döviz/maden seçer
2. İşlem tipi seçilir (almak/satmak)
3. Serbest piyasa sonucu hesaplanır:
   - Almak istiyorum: amount × selling_price
   - Satmak istiyorum: amount × buying_price
4. Premium kullanıcı ise banka sonuçları da hesaplanır
5. Sonuçlar döner
   **Kurallar/Kısıtlar:**

- Şimdilik sadece TRY'ye çevrim desteklenir
- Serbest piyasa sonucu herkese açık
- Banka bazlı sonuçlar premium özellik

---

### 2.9 - Öneriler Getirme (Get Recommendations)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
  **Çıkış (Output):**
- recommendations: array
  - code: string - Döviz/Maden kodu
  - name: string - Döviz/Maden adı
  - logo_url: string - Bayrak/Logo URL'i
  - type: string - Tip ("currency" | "commodity")
  - daily_change_percentage: decimal - Günlük değişim (%)
  - daily_change_status: string - Değişim durumu
  - is_followed: boolean - Takip durumu
- show_recommendations: boolean - Öneriler gösterilsin mi
  **Akış:**

1. Kullanıcının takip listesi kontrol edilir
2. Takip listesinde 2 veya daha fazla item varsa:
   - show_recommendations: false döner
3. Takip listesinde 2'den az item varsa:
   _ Statik öneri listesi (Gram Altın, USD, EUR) alınır
   _ Takip edilenler listeden çıkarılır \* Kalan öneriler döner
   **Kurallar/Kısıtlar:**

- Statik öneri listesi: Gram Altın, USD, EUR
- Kullanıcı 2+ item takip ediyorsa öneriler gizlenir
- Takip edilen itemlar önerilerden çıkarılır

---

## İlişkiler (Diğer Modüllerle)

- **User Modülü:** Takip listesi kontrolü için kullanıcı bilgisi gerekir. Premium kontrolü için user_type kontrol edilir.
- **Harita Modülü:** Haritada gösterilen döviz büroları için konum verisi sağlar (dolaylı ilişki).

---

## Özel Notlar ve Gereksinimler

### Veri Kaynağı

- Kaynak: [canlidoviz.com](http://canlidoviz.com)
- Çekilen veriler: Serbest piyasa kurları, banka kurları
- Scraper dakikalık çalışır

### Fiyat Mantığı

- Current Price = Selling Price
- Almak istiyorum → Bankanın Selling Price'ı gösterilir
- Satmak istiyorum → Bankanın Buying Price'ı gösterilir

### Günlük Değişim Hesabı

- Referans: Bir önceki günün kapanış fiyatı
- daily_change = current_price - previous_close
- daily_change_percentage = (daily_change / previous_close) × 100
- daily_change_status:
  - "up": daily_change > 0
  - "down": daily_change < 0
  - "stable": daily_change = 0

### Piyasa Durumu

- Backend'de tutulur (is_market_open: boolean)
- Frontend'e ayrıca gösterilmez
- Piyasa kapalıyken son kapanış fiyatları gösterilir

### Desteklenen Dövizler

USD, EUR, GBP, CHF, CAD, RUB, AED, AUD, DKK, SEK, NOK, JPY, KWD

### Desteklenen Madenler

Gram Altın, Ons, Çeyrek, Yarım, Tam, Cumhuriyet, Gremse, Has, Gümüş

### Desteklenen Bankalar

Kapalı Çarşı, Akbank, Albaraka, Denizbank, Enpara, Fibabanka, QNB Finansbank, Garanti Bankası, Halkbank, HSBC, ING Bank, İş Bankası, Kuveyt Türk, Merkez Bankası, Şekerbank, TEB, Vakıfbank, Yapı Kredi, Ziraat Bankası

### Banka Kur Desteği

- Her banka her döviz/maden için kur sağlamayabilir
- Kur sağlamayan banka-döviz/maden kombinasyonları listelenmez

### Premium Özellikler

- Banka kurları karşılaştırma
- Banka detay görüntüleme

---

## API Endpoints

**Döviz/Maden/Banka Tanımları:**

- GET /api/currencies - Döviz listesi
- GET /api/commodities - Maden listesi
- GET /api/banks - Banka listesi
  **Serbest Piyasa Kurları:**
- GET /api/rates/free-market - Tüm serbest piyasa kurları
  - Query params: type, search, device_id
- GET /api/rates/free-market/:code - Belirli döviz/maden kuru
  **Banka Kurları:**
- GET /api/rates/banks/:code - Belirli döviz/maden için banka kurları
  - Query params: type, transaction_type
- GET /api/rates/banks/:code/:bank_code - Belirli banka detayı \* Query params: type
  **Çevirici:**
- POST /api/converter/calculate - Çeviri hesaplama
  **Öneriler:**
- GET /api/recommendations - Öneri listesi \* Query params: device_id
  **Scraper (Internal):**
- POST /api/internal/scraper/run - Manuel scraper tetikleme (admin)
- GET /api/internal/scraper/status - Scraper durumu (admin)

##
