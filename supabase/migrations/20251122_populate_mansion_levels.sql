-- Mansion Levels tablosunu oluştur (eğer yoksa)
create table if not exists mansion_levels (
  level int primary key,
  name text not null,
  description text,
  build_cost numeric not null,
  upgrade_cost numeric not null,
  hourly_income numeric not null,
  required_defense int not null,
  max_defense int not null
);

-- Varsayılan verileri ekle
insert into mansion_levels (level, name, description, build_cost, upgrade_cost, hourly_income, required_defense, max_defense)
values
  (1, 'Küçük Malikane', 'Başlangıç seviyesi bir aile evi.', 10000000, 0, 1000, 50, 200),
  (2, 'Genişletilmiş Malikane', 'Daha fazla oda ve güvenlik.', 0, 25000000, 2500, 150, 500),
  (3, 'Lüks Villa', 'Yüzme havuzu ve geniş bahçe.', 0, 50000000, 5000, 300, 1000),
  (4, 'Güvenli Yerleşke', 'Yüksek duvarlar ve güvenlik kameraları.', 0, 100000000, 10000, 600, 2000),
  (5, 'Mafya Kalesi', 'Aileniz için geçilmez bir kale.', 0, 250000000, 25000, 1200, 5000),
  (6, 'Saray', 'Krallara layık bir yaşam alanı.', 0, 500000000, 50000, 2500, 10000),
  (7, 'Ada Malikanesi', 'Özel bir adada izole yaşam.', 0, 1000000000, 100000, 5000, 20000),
  (8, 'Yeraltı Sığınağı', 'Nükleer saldırıya bile dayanıklı.', 0, 2500000000, 250000, 10000, 50000),
  (9, 'Gökyüzü Kulesi', 'Şehrin tepesinde, bulutların üzerinde.', 0, 5000000000, 500000, 20000, 100000),
  (10, 'Dünya Hakimiyet Merkezi', 'Tüm operasyonların yönetildiği merkez.', 0, 10000000000, 1000000, 50000, 250000)
on conflict (level) do update set
  name = excluded.name,
  description = excluded.description,
  build_cost = excluded.build_cost,
  upgrade_cost = excluded.upgrade_cost,
  hourly_income = excluded.hourly_income,
  required_defense = excluded.required_defense,
  max_defense = excluded.max_defense;
