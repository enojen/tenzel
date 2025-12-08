# MODÜL: USER (Kullanıcı)

## Genel Tanım

User modülü, uygulamaya giriş yapan cihazların anonim kullanıcı olarak kaydedilmesi, abonelik durumlarının yönetilmesi ve takip listelerinin tutulmasını sağlar. Kayıt/giriş sistemi yoktur; Device ID bazlı anonim kullanıcı yapısı kullanılır.

---

## Alt Modüller ve Tanımları

### 1.1 Kullanıcı Oluşturma (Create User)

- **Tanım:** Yeni cihaz için kullanıcı kaydı
- **Ne Yapar:** Device ID ile anonim kullanıcı oluşturur

### 1.2 Kullanıcı Getirme (Get User)

- **Tanım:** Mevcut kullanıcı bilgilerini çekme
- **Ne Yapar:** Device ID ile kullanıcı bilgilerini döner

### 1.3 Abonelik Yönetimi (Subscription Management)

- **Tanım:** Kullanıcı abonelik durumu yönetimi
- **Ne Yapar:** Free/Paid geçişlerini ve abonelik yenilemelerini yönetir

### 1.4 Takip Listesi Yönetimi (Followed List Management)

- **Tanım:** Kullanıcının takip ettiği döviz/maden listesi
- **Ne Yapar:** Takip ekleme, çıkarma ve listeleme işlemlerini yönetir

### 1.5 Kullanıcı Silme (Delete User)

- **Tanım:** Kullanıcı verisini silme
- **Ne Yapar:** Uygulama silindiğinde veya istek üzerine tüm kullanıcı verisini siler

### 1.6 Uygulama Konfigürasyonu (App Config)

- **Tanım:** Dinamik uygulama ayarları
- **Ne Yapar:** Abonelik fiyatı gibi dinamik değerleri döner

---

## İşlevler (Fonksiyonlar)

### 1.1 - Kullanıcı Oluşturma (Create User)

**Giriş (Input):**

- device_id: string - Frontend (Expo) tarafından üretilen cihaz kimliği
  **Çıkış (Output):**
- user_id: string - Oluşturulan kullanıcı ID'si
- user_type: string - Kullanıcı tipi ("free")
- created_at: datetime - Oluşturulma tarihi
  **Akış:**

1. Uygulama ilk açılışta Expo ile Device ID üretir
2. Device ID backend'e gönderilir
3. Device ID kontrolü yapılır (mevcut mu?)
4. Mevcut değilse yeni kullanıcı oluşturulur (user_type: "free")
5. Mevcut ise mevcut kullanıcı bilgileri döner
6. User ID ve bilgileri frontend'e döner
   **Kurallar/Kısıtlar:**

- Device ID unique olmalı
- Her Device ID için tek bir kullanıcı
- Varsayılan user_type: "free"
- Takip listesi boş olarak başlar

---

### 1.2 - Kullanıcı Getirme (Get User)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
  **Çıkış (Output):**
- user_id: string - Kullanıcı ID'si
- user_type: string - Kullanıcı tipi ("free" | "paid")
- subscription_expires_at: datetime | null - Abonelik bitiş tarihi (paid ise)
- followed_items: array - Takip edilen döviz/maden listesi
- created_at: datetime - Kayıt tarihi
  **Akış:**

1. Device ID ile backend'e istek atılır
2. Kullanıcı veritabanında aranır
3. Bulunursa kullanıcı bilgileri döner
4. Bulunamazsa 404 hatası döner
   **Kurallar/Kısıtlar:**

- Device ID zorunlu
- Kullanıcı bulunamazsa hata döner

---

### 1.3 - Abonelik Yönetimi (Subscription Management)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
- receipt_data: string - Store'dan gelen ödeme makbuzu
- platform: string - Platform bilgisi ("ios" | "android")
  **Çıkış (Output):**
- user_type: string - Güncel kullanıcı tipi
- subscription_expires_at: datetime - Abonelik bitiş tarihi
- success: boolean - İşlem durumu
  **Akış:**

1. Kullanıcı Paywall'da ödeme yapar
2. Store ödemeyi onaylar
3. Receipt data backend'e gönderilir
4. Backend receipt'i doğrular (Store API ile)
5. Doğrulama başarılıysa user_type "paid" olarak güncellenir
6. subscription_expires_at 1 ay sonrası olarak ayarlanır
7. Güncel kullanıcı bilgileri döner
   **Abonelik Yenileme Akışı:**
8. Store otomatik yenileme yapar
9. Webhook veya receipt ile backend bilgilendirilir
10. subscription_expires_at güncellenir
    **Abonelik İptal/Bitiş Akışı:**
11. Abonelik yenilenmezse subscription_expires_at geçer
12. Periyodik job ile kontrol edilir
13. Süresi geçmiş kullanıcılar user_type "free" olarak güncellenir
    **Kurallar/Kısıtlar:**

- Abonelik süresi: 1 ay
- Abonelik yenilenmezse otomatik "free"ye düşer
- Receipt validation zorunlu
- Platform bilgisi zorunlu (iOS/Android farklı doğrulama)

---

### 1.4 - Takip Listesi Yönetimi (Followed List Management)

#### 1.4.1 - Takip Ekleme (Add to Followed List)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
- item_type: string - Öğe tipi ("currency" | "commodity")
- item_code: string - Döviz/Maden kodu (örn: "USD", "GRAM_GOLD")
  **Çıkış (Output):**
- success: boolean - İşlem durumu
- followed_items: array - Güncel takip listesi
  **Akış:**

1. Kullanıcı döviz/maden kartında "+ Takip Et" butonuna tıklar
2. Backend'e ekleme isteği gönderilir
3. Item zaten takip listesinde mi kontrolü yapılır
4. Değilse listeye eklenir (sona eklenir)
5. Güncel liste döner
   **Kurallar/Kısıtlar:**

- Aynı item tekrar eklenemez
- Ekleme sırasına göre sıralanır
- Maksimum limit yok

#### 1.4.2 - Takipten Çıkarma (Remove from Followed List)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
- item_type: string - Öğe tipi ("currency" | "commodity")
- item_code: string - Döviz/Maden kodu
  **Çıkış (Output):**
- success: boolean - İşlem durumu
- followed_items: array - Güncel takip listesi
  **Akış:**

1. Kullanıcı "Takibi Bırak" butonuna tıklar
2. Backend'e silme isteği gönderilir
3. Item listeden çıkarılır
4. Güncel liste döner
   **Kurallar/Kısıtlar:**

- Listede olmayan item için hata dönmez (idempotent)

#### 1.4.3 - Takip Listesi Getirme (Get Followed List)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
  **Çıkış (Output):**
- followed_items: array
  _ item_type: string - Öğe tipi
  _ item_code: string - Döviz/Maden kodu \* added_at: datetime - Eklenme tarihi
  **Akış:**

1. Device ID ile istek atılır
2. Kullanıcının takip listesi döner
3. Liste ekleme sırasına göre sıralı gelir

---

### 1.5 - Kullanıcı Silme (Delete User)

**Giriş (Input):**

- device_id: string - Cihaz kimliği
  **Çıkış (Output):**
- success: boolean - İşlem durumu
  **Akış:**

1. Uygulama silindiğinde veya manuel tetiklendiğinde çalışır
2. Device ID ile kullanıcı bulunur
3. Kullanıcıya ait tüm veriler silinir (takip listesi dahil)
4. Başarı durumu döner
   **Kurallar/Kısıtlar:**

- Silme işlemi geri alınamaz
- Tüm ilişkili veriler silinir

---

### 1.6 - Uygulama Konfigürasyonu (App Config)

**Giriş (Input):**

- Yok
  **Çıkış (Output):**
- subscription: object
  _ price: decimal - Abonelik fiyatı
  _ currency: string - Para birimi ("TRY")
  _ period: string - Dönem ("monthly")
  _ features: array - Premium özellikler listesi
  **Akış:**

1. Uygulama açılışında veya Paywall gösterilmeden önce çağrılır
2. Güncel abonelik fiyatı ve özellikleri döner
   **Kurallar/Kısıtlar:**

- Cache'lenebilir (sık değişmez)
- Fiyat değişikliği admin panelinden yapılır

---

## İlişkiler (Diğer Modüllerle)

- **Döviz-Maden-Banka Modülü:** Takip listesindeki item'ların detay bilgileri bu modülden çekilir. Premium kontrolü için user_type kontrol edilir.
- **Harita Modülü:** Harita özelliği herkese açık, premium kontrolü yok.

---

## Özel Notlar ve Gereksinimler

### Device ID

- Expo tarafından üretilir (expo-device veya expo-application)
- Unique identifier olarak kullanılır
- Backend'de primary key değil, unique index olarak tutulur

### Abonelik Sistemi

- Ödeme: App Store / Google Play üzerinden
- Süre: Aylık
- Otomatik yenileme: Store tarafından yönetilir
- Receipt validation: Backend'de yapılır
- Süresi dolan abonelikler için periyodik kontrol job'ı gerekli

### Veri Saklama

- Uygulama silindiğinde tüm veriler silinir
- GDPR/KVKK kapsamında "Verilerimi sil" özelliği yok (anonim kullanıcı)

### Güvenlik

- Device ID manipulation koruması düşünülmeli
- Rate limiting uygulanmalı

---

## API Endpoints

**Kullanıcı İşlemleri:**

- POST /api/users - Kullanıcı oluştur veya getir (Device ID ile)
- GET /api/users/:device_id - Kullanıcı bilgilerini getir
- DELETE /api/users/:device_id - Kullanıcı sil
  **Abonelik İşlemleri:**
- POST /api/users/:device_id/subscription - Abonelik başlat/doğrula
- GET /api/users/:device_id/subscription - Abonelik durumu getir
  **Takip Listesi İşlemleri:**
- GET /api/users/:device_id/followed - Takip listesi getir
- POST /api/users/:device_id/followed - Takibe ekle
- DELETE /api/users/:device_id/followed/:item_code - Takipten çıkar
  **Konfigürasyon:**
- GET /api/config/subscription - Abonelik konfigürasyonu

##
