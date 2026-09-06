-- ============================================================================
-- Emre Bey — Daire Envanteri seed (units tablosu, migration 0019)
-- Excel: SARPER KİRA TAKİP. Tüm daireler 'occupied' (dolu) eklenir; boş
-- olanları uygulamada Mülkler > Envanter'den dokunarak işaretleyin.
-- ON CONFLICT DO NOTHING: mevcut kayıt/sözleşme HİÇ bozulmaz, çakışan kalır.
--
-- 1) Emre Bey'in company_id'sini bulun:
--      select id, name from companies order by name;
-- 2) Aşağıdaki :company_id yerine o UUID'yi yazın (tek yerde).
-- ============================================================================

-- \set company_id '00000000-0000-0000-0000-000000000000'  -- psql kullanıyorsanız

do $$
declare
  v_company uuid := 'COMPANY_ID_BURAYA'::uuid;  -- <<< Emre Bey'in company_id'si
begin
  -- EGE İREM (10 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '21', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '22', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '24', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '26', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '30', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '31', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '32', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '34', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '36', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'EGE İREM', '', '40', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- ELİZE APT (6 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ELİZE APT', '', '1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ELİZE APT', '', '2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ELİZE APT', '', '3', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ELİZE APT', '', '4', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ELİZE APT', '', '5', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ELİZE APT', '', '6', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- ÖZ APT (5 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ÖZ APT', '', '1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ÖZ APT', '', '2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ÖZ APT', '', '3', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ÖZ APT', '', '4', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'ÖZ APT', '', '5', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- SERDEN GEÇTİ (2 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'SERDEN GEÇTİ', '', 'A1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'SERDEN GEÇTİ', '', 'A2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- 42EVLER (34 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '01', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '02', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '03', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '04', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '05', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '06', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '07', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '08', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '09', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '10', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '11', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '12', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '13', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '14', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '15', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '16', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '17', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '18', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '19', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '20', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '21', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '22', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '23', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '24', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '25', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '26', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '27', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '28', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '29', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '30', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '31', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '32', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '33', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, '42EVLER', '', '34', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- YÜRÜYÜŞ YOLU (8 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '3', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '4', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '5', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '6', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '7', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'YÜRÜYÜŞ YOLU', '', '8', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- DREAM REZİDANS — C1 Blok (22 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '3', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '4', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '5', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '6', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '7', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '8', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '9', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '10', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '11', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '12', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '13', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '14', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '15', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '16', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '17', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '18', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '19', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '20', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '21', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C1', '22', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- DREAM REZİDANS — C2 Blok (22 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '3', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '4', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '5', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '6', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '7', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '8', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '9', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '10', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '11', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '12', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '13', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '14', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '15', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '16', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '17', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '18', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '19', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '20', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '21', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', 'C2', '22', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

  -- DREAM REZİDANS — 5 Blok (16 daire)
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '1', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '2', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '3', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '4', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '5', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '6', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '7', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '8', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '9', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '10', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '11', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '12', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '13', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '14', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '15', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;
  insert into units (company_id, building, block, unit_label, status) values (v_company, 'DREAM REZİDANS', '5', '16', 'occupied') on conflict (company_id, building, block, unit_label) do nothing;

end $$;

-- Toplam 125 daire eklenir (çakışanlar atlanır).
