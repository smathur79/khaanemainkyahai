import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cuisine, mealType, ingredients, maxPrepTime, count, familyPreferences } = await req.json();

    const prompt = `You are a home cooking expert. Generate ${count || 3} creative, practical recipes.

Requirements:
- Cuisine: ${cuisine || "any"}
- Meal type: ${mealType || "lunch"}
- Max prep time: ${maxPrepTime || 30} minutes
${ingredients ? `- Must use these ingredients: ${ingredients}` : ""}
${familyPreferences ? `- Family preferences: ${familyPreferences}` : ""}

Return ONLY a JSON array (no markdown, no backticks) with objects having these exact fields:
- title (string)
- description (string, 1-2 sentences)
- mealTypes (array of strings from: breakfast, lunch, dinner, snack, smoothie, dessert)
- cuisine (string)
- subCuisine (string, specific regional style or empty)
- foodType (one of: vegan, vegetarian, egg, chicken, fish)
- healthTag (one of: healthy, balanced, indulgent)
- effort (one of: quick, medium, weekend)
- moodTag (one of: comfort, light, kid-friendly, adventurous, hearty, refreshing)
- prepTimeMinutes (number)
- difficulty (one of: Easy, Medium, Hard)
- ingredients (array of strings, each a specific ingredient with quantity)
- instructions (string, step-by-step separated by periods)
- tags (array of strings for searchability)
- kidFriendly (boolean)
- highProtein (boolean)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "[]";
    
    // Parse JSON from response, handling potential markdown wrapping
    let recipes;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      recipes = JSON.parse(cleaned);
    } catch {
      recipes = [];
    }

    return new Response(JSON.stringify({ recipes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error), recipes: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
