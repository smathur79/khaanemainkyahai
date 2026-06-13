insert into public.jokes (question, answer)
select v.question, v.answer
from (
  values
    ('How does an attorney sleep?', 'First he lies on one side, then he lies on the other side.'),
    ('I have a few jokes about unemployed people,', 'but none of them work.'),
    ('How do you make holy water?', 'You take some water and boil the hell out of it.'),
    ('Will glass coffins be a success?', 'Remains to be seen!'),
    ('Two windmills are standing in a wind farm. One asks, "What is your favorite kind of music?"', 'The other says, "I am a big metal fan!"'),
    ('Heard about the new restaurant called Karma?', 'There is no menu, you get what you deserve!'),
    ('I went to buy some camouflage trousers yesterday,', 'but couldn''t find them.'),
    ('What do you call a bee that can''t quite make up its mind?', 'A maybe.'),
    ('I tried to sue the airline for losing my luggage.', 'I lost my case.'),
    ('She had a photographic memory,', 'but never developed it.'),
    ('Is it ignorance or apathy that is destroying the world today?', 'I don''t know and I don''t care!'),
    ('I wasn''t originally going to get a brain transplant,', 'but then I changed my mind.'),
    ('Which country''s capital has the fastest-growing population?', 'Ireland, of course. It''s always Dublin.'),
    ('My ex-wife still misses me,', 'but her aim is starting to improve.'),
    ('The guy who invented the door knocker', 'got a No-bell prize.'),
    ('I saw an advertisement for burial plots, and I thought:', '"That''s the last thing I need!"'),
    ('If you need an ark,', 'I Noah guy.'),
    ('I used to be indecisive.', 'Now, I am not so sure.')
) as v(question, answer)
where not exists (
  select 1
  from public.jokes j
  where j.question = v.question
    and j.answer = v.answer
);
