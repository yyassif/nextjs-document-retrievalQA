-- Custom enum types
create type public.user_assistant_enum as enum ('user', 'assistant');

-- Enable pgvector extension
create extension vector with schema extensions;

-- Create the table for the conversations
create table public.conversations (
  id uuid not null default gen_random_uuid () primary key,
  name text not null default now()::text,
  created_at timestamp with time zone not null default now()
);
comment on table public.conversations is 'Conversations between users and the assistant.';

-- Create the table for the messages
create table public.messages (
  id uuid not null default gen_random_uuid () primary key,
  body text,
  role user_assistant_enum default 'user'::public.user_assistant_enum,
  created_at timestamp with time zone not null default now(),
  conversation_id uuid references public.conversations on delete cascade not null
);
comment on table public.messages is 'Messages content for each conversation.';

-- Create the table for the documents to store the content and metadata Chunks of the PDFs
create table public.documents (
  id bigserial primary key,
  content text, -- corresponds to Document.pageContent
  metadata jsonb, -- corresponds to Document.metadata
  embedding vector(1536), -- 1536 works for OpenAI embeddings
  ollama_embedding vector(768) -- 768 works for Ollama embeddings
);
comment on table public.documents is 'PDF Documents pertaining to a Document Chunk.';


-- Create a function to search for documents
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  embedding jsonb,
  similarity float
) as $$
begin return query
  select
    documents.id as id,
    documents.content as content,
    documents.metadata as metadata,
    (documents.embedding::text)::jsonb as embedding,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$ language plpgsql security definer;

-- Create a function to search for documents for ollama
create or replace function public.match_ollama_documents(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  embedding jsonb,
  similarity float
) as $$
begin return query
  select
    documents.id as id,
    documents.content as content,
    documents.metadata as metadata,
    (documents.ollama_embedding::text)::jsonb as embedding,
    1 - (documents.ollama_embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.ollama_embedding <=> query_embedding
  limit match_count;
end;
$$ language plpgsql security definer;

-- Secure the tables by Enabling the Row Level Security
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;

-- Conversations Policies
create policy "Allow public select access" on public.conversations for select using ( true );
create policy "Allow public insert access" on public.conversations for insert with check ( true );
create policy "Allow public update access" on public.conversations for update using ( true );
create policy "Allow public delete access" on public.conversations for delete using ( true );

-- Ducment Messages Policies
create policy "Allow public select access" on public.messages for select using ( true );
create policy "Allow public insert access" on public.messages for insert with check ( true );
create policy "Allow public delete access" on public.messages for delete using ( true );

-- Document Chunks Policies
create policy "Allow public select access" on public.documents for select using ( true );
create policy "Allow public insert access" on public.documents for insert with check ( true );

-- Send "Previous Data" on change as WebSocket Subscription
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.documents replica identity full;

/**
 * REALTIME SUBSCRIPTIONS
 * Only allow realtime listening on public tables.
 */

begin; 
  -- Remove the realtime publication
  drop publication if exists supabase_realtime; 

  -- Re-Create the publication but don't enable it for any tables
  create publication supabase_realtime;  
commit;

-- Add tables to the publication
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;


-- Storge Buckets
insert into storage.buckets (id, name, file_size_limit, allowed_mime_types) values ( 'documents', 'documents', 52428800, ARRAY ['application/pdf'] );

-- Security Policies for Storage 
create policy "Allow public access to bukets" on "storage"."buckets" for all using ( true );
create policy "Allow public access to storage" on "storage"."objects" for all using ( true );
