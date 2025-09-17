import 'dotenv/config';
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";

const openAIApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: openAIApiKey,
});

// Create vector store
const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabase,
  tableName: "documents",
  queryName: "match_documents",
});

// Create retriever
export const retriever = vectorStore.asRetriever({
  k: 6,
});
   
export { vectorStore };