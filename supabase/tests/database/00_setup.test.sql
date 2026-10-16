-- pgTAP is needed by every test file; the files run in name order.
create extension if not exists pgtap with schema extensions;

begin;
select plan(1);
select has_function('extensions', 'plan', array['integer'], 'pgTAP is installed');
select * from finish();
rollback;
