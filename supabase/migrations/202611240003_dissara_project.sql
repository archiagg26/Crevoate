insert into public.portfolio(data) values (
  '{"id":"dissara","name":"Dissara","sector":"Jewellery","category":"Web Development","color":"#f4df8b","ink":"#292116","style":"ora","intro":"A live jewellery storefront featuring collections for everyday wear.","problem":"","audience":"","strategy":"","process":"","identity":"","deliverables":"","liveUrl":"https://www.dissara.com/"}'::jsonb
) on conflict ((data->>'id')) do nothing;
