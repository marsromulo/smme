-- Update only the SHS service; preserve applications and uploaded files.
begin;

update public.services
set name = 'Senior High Recognition Application',
    description = 'Required documents for Senior High Recognition Application.'
where code = 'SHS';

create temporary table shs_requirements (name text, sort_order integer) on commit drop;
insert into shs_requirements (name, sort_order)
values
  ('Curriculum & Teaching', 1),
  ('K to 12 Curriculum: Work Immersion & Culminating Activity', 2),
  ('Leadership & Management', 3),
  ('School Site & Facilities', 4),
  ('Learner Support', 5),
  ('Planning & Development', 6),
  ('Faculty', 7),
  ('Budget & Finance', 8);

-- Removed requirements detach from existing uploads (ON DELETE SET NULL).
-- Uploaded files and their review history remain intact.
delete from public.service_required_documents d
using public.services s
where d.service_id = s.id
  and s.code = 'SHS'
  and not exists (select 1 from shs_requirements r where r.name = d.name);

insert into public.service_required_documents (service_id, name, sort_order, is_required)
select s.id, r.name, r.sort_order, true
from public.services s
cross join shs_requirements r
where s.code = 'SHS'
on conflict (service_id, name) do update
set sort_order = excluded.sort_order,
    is_required = excluded.is_required;

commit;
