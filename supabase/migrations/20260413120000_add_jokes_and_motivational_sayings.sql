-- ── jokes ──────────────────────────────────────────────────────────────────
create table if not exists public.jokes (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.jokes enable row level security;

create policy "Anyone authenticated can read jokes"
  on public.jokes for select
  to authenticated
  using (true);

-- ── motivational_sayings ───────────────────────────────────────────────────
create table if not exists public.motivational_sayings (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  source      text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.motivational_sayings enable row level security;

create policy "Anyone authenticated can read motivational_sayings"
  on public.motivational_sayings for select
  to authenticated
  using (true);

-- ── seed jokes ─────────────────────────────────────────────────────────────
insert into public.jokes (question, answer) values
  ('Why did the scarecrow win an award?', 'Because he was outstanding in his field!'),
  ('What do you call a fish without eyes?', 'A fsh!'),
  ('Why can''t you give Elsa a balloon?', 'Because she''ll let it go!'),
  ('What do you call cheese that isn''t yours?', 'Nacho cheese!'),
  ('Why did the bicycle fall over?', 'Because it was two-tired!'),
  ('What do you call a sleeping dinosaur?', 'A dino-snore!'),
  ('Why did the math book look so sad?', 'Because it had too many problems.'),
  ('What do elves learn in school?', 'The elf-abet!'),
  ('Why don''t scientists trust atoms?', 'Because they make up everything!'),
  ('What do you call a bear with no teeth?', 'A gummy bear!'),
  ('How do you organize a space party?', 'You planet!'),
  ('What did the ocean say to the beach?', 'Nothing, it just waved!'),
  ('Why did the golfer bring two pairs of pants?', 'In case he got a hole in one!'),
  ('What do you call a fake noodle?', 'An impasta!'),
  ('Why did the tomato turn red?', 'Because it saw the salad dressing!'),
  ('What did the janitor say when he jumped out of the closet?', 'Supplies!'),
  ('Why do cows wear bells?', 'Because their horns don''t work!'),
  ('What do you call a snowman with a six-pack?', 'An abdominal snowman!'),
  ('Why did the banana go to the doctor?', 'Because it wasn''t peeling well!'),
  ('What do you call a dino with no imagination?', 'A bronto-bore-us!'),
  ('What did one wall say to the other?', 'I''ll meet you at the corner!'),
  ('Why did the stadium get hot after the game?', 'Because all the fans left!');

-- ── seed motivational_sayings ─────────────────────────────────────────────
insert into public.motivational_sayings (text, source) values
  ('To get through the hardest journey, we need take only one step at a time, but we must keep on stepping.', 'Chinese Proverb'),
  ('A lot of problems persist because the solution is too simple to take seriously.', null),
  ('The ultimate reason for setting goals is to entice you to become the person it takes to achieve them.', 'Jim Rohn'),
  ('Consensus is the process of avoiding the very issues that have to be solved.', 'Margaret Thatcher'),
  ('Forgive everything but malicious intent. Nearly everyone deserves a second chance.', null),
  ('People don''t evaluate your reasoning. They evaluate you. We reject a recommendation from someone we don''t like but embrace it from someone we admire. If you want to persuade, sell yourself before you sell your ideas.', null),
  ('In the sky, there is no distinction between east and west; people create distinctions in their own minds and then believe them to be true.', 'Gautama Siddhartha'),
  ('Most people self-limit their ability to learn. Just read books and talk to people. I didn''t study rocket engineering, I picked it up along the way.', 'Elon Musk'),
  ('There''s a distinctive signature to authentic people: they prefer meaningful conversations with a few over shallow exchanges with many. Their love is demonstrated rather than declared. Their words and actions align, even when no one''s watching. They bring a quality of presence that makes you feel truly seen, and carry a sense of peace and joy that doesn''t depend on external validation.', 'Vex King');
