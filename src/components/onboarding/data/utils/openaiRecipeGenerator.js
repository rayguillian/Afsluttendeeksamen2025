import { v4 as uuidv4 } from 'uuid';
import config from '../../../../config.js';

const createSystemPrompt = () => {
  return `You are a professional chef and nutritionist specializing in Danish cuisine and dietary requirements. 
Generate recipes that strictly follow this JSON schema and requirements:
{
  id: string (UUID),
  name: string (in Danish),
  cuisine: string (one of: Dansk, Italiensk, Kinesisk, Japansk, Thailandsk, Vietnamesisk, Mexicansk, Indisk, Middelhavet),
  time: string (minutes + " min"),
  ingredients: [{
    name: string (in Danish),
    price: number (original price),
    discountPrice: number (must be ~30% less than price)
  }]
}

IMPORTANT REQUIREMENTS:
1. Each recipe MUST be unique and different from others
2. Strictly follow dietary preferences and allergies
3. Cooking time must match the specified time category
4. Ingredients must be available in Danish supermarkets
5. Prices must be realistic for Denmark
6. All text must be in Danish`;
};

const createUserPrompt = (preferences, index) => {
  const { cuisine, prepTime, dietaryPreferences, allergies } = preferences;
  
  return `Generate recipe #${index + 1} with these requirements:
- Cuisine: ${cuisine.name} (${cuisine.id})
- Prep time: ${prepTime.minutes} minutes (${prepTime.category})
- Dietary preferences: ${dietaryPreferences.map(p => p.label).join(', ')}
- Allergies to avoid: ${allergies.map(a => a.label).join(', ')}

Return ONLY the JSON object, no additional text.`;
};

const generateRecipe = async (preferences, index) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: createSystemPrompt(),
          },
          {
            role: 'user',
            content: createUserPrompt(preferences, index),
          },
        ],
        temperature: 0.7 + (index * 0.1), // Increase variation for each recipe
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recipe = JSON.parse(data.choices[0].message.content);
    recipe.id = uuidv4();
    return recipe;
  } catch (error) {
    console.error('Error generating recipe:', error);
    throw error;
  }
};

export const generateMultipleRecipes = async (preferences) => {
  try {
    // Generate 3 recipes in parallel for speed
    const recipePromises = [0, 1, 2].map(index => 
      generateRecipe(preferences, index)
    );
    
    const recipes = await Promise.all(recipePromises);
    return recipes;
  } catch (error) {
    console.error('Error generating recipes:', error);
    throw error;
  }
};
