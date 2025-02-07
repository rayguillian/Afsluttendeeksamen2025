# KobSmart

A smart shopping assistant that helps users discover recipes based on their preferences and optimizes their shopping route.

## Features

- Recipe recommendations based on cuisine and dietary preferences
- AI-powered recipe generation using OpenAI
- Shopping route optimization
- Danish language interface

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kobsmart.git
cd kobsmart
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env`
- Add your OpenAI API key to the `.env` file:
```
VITE_OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# OpenAI API Configuration
VITE_OPENAI_API_KEY=your_api_key_here  # Required for recipe generation
```

The application uses these environment variables through the configuration system in `src/config.js`. This ensures:
- Secure handling of sensitive data
- Centralized configuration management
- Environment-specific settings
- Validation of required variables

## Development

### Tech Stack
- Vite for development and building
- React for the UI
- Tailwind CSS for styling
- OpenAI GPT-4 for recipe generation

### Configuration
The application's configuration is managed through `src/config.js`, which includes:
- OpenAI API settings (model, temperature)
- Cache settings
- Environment variable validation

### Development Setup
1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Start development server:
```bash
npm run dev
```

## Recipe Generation

Recipes are generated using OpenAI's GPT-4 model, taking into account:
- Selected cuisine type
- Preparation time preferences
- Dietary restrictions and preferences
- Allergies

The generated recipes include:
- Ingredients with amounts and units
- Step-by-step instructions in Danish
- Nutritional information
- Cost estimates

If the OpenAI service is unavailable, the system falls back to pre-defined static recipes.
