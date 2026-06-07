Your journey is basically right. The issue is you’re mixing profile settings, tonight’s decision, shopping mode, and recipe mode into one blob. That’s why the UI feels like oatmeal. You need four clean layers.

KøbSmart should be architected around this sentence:

Choose what you eat. KøbSmart finds the cheapest useful way to buy it, then turns it into a route and cooking flow.

Your report already supports this direction: users mentally separated meal planning from price/route planning, while they naturally grouped price comparison and route planning together. Also, route planning was one of the strongest validated features in your testing, with 12 out of 15 reacting positively to optimized shopping routes.

The key architecture

Split everything into these four layers:

1. Profile memory

These are stable preferences. Users should not repeat them every time.

Store in profile:

dietary restrictions: halal, vegetarian, no pork, gluten-free, allergies
household size / servings
preferred store chains: Netto, Rema 1000, Føtex, Bilka, Lidl, Meny
default location / shopping area
max extra route distance
pantry staples: rice, pasta, oil, onions, spices
disliked ingredients
default budget style: cheapest / balanced / closest

This is the user’s “default brain.”

2. Tonight mode

This is temporary. It answers:

“What are we eating tonight?”

User can adjust:

cuisine type
time available
servings
mood: cheap / fast / healthy / family-friendly / high protein
route preference for this meal: cheapest / closest / balanced
stores to include or exclude today

Cuisine should not only live in profile. It should have defaults in profile, but be adjustable each session. One day I want Thai, next day I want pasta. Making users change profile for that is dumb UX.

3. Active meal plan

Once the user picks a recipe, the app creates a plan.

A plan contains:

selected recipe
required ingredients + amounts
matched offers
store options per ingredient
chosen store per ingredient
pantry items removed
total price
savings
route
shopping list
cooking steps

This is the core object of the app.

4. Shopping/cooking mode

Once the plan is made, the app becomes a checklist and route tool.

The user can:

mark ingredients as “I already have this”
mark items as bought
swap a store
swap an ingredient
skip a store
recalculate route
finish shopping
open cook mode

Important: do not hide the recipe until the end. That’s annoying. Users need to see the recipe before committing. But after all ingredients are ticked off, the app should switch into a satisfying Cook Mode.

The actual user journey
First-time onboarding

Keep it short.

Step 1 — Location / area

Hvor handler du typisk?

Ask for postcode or location.

Then show nearby chains:

Netto
Rema 1000
Føtex
Bilka
Lidl
Meny
Coop

User selects preferred chains.

Step 2 — Food rules

Hvad skal vi tage hensyn til?

Chips:

Ingen svinekød
Halal
Vegetar
Vegansk
Glutenfri
Laktosefri
Nøddeallergi
Sojaallergi
Fisk/skaldyr
Step 3 — Food preferences

Hvilke køkkener vil du gerne se?

Multi-select:

Dansk
Italiensk
Mexicansk
Indisk
Thai
Japansk
Mellemøstlig
Vegetarisk
Hurtig hverdagsmad
Step 4 — Household

Hvor mange laver du typisk mad til?

1 / 2 / 3 / 4 / 5+

Step 5 — Pantry basics

Hvad har du næsten altid hjemme?

Chips:

ris
pasta
olie
løg
hvidløg
mel
krydderier
æg
mælk
smør

This should be editable later.

Then onboarding ends with an immediate reward:

Vi har fundet 6 måltider ud fra dagens tilbud.

Not “setup complete.” That’s boring.

Main IA

Use this bottom nav:

Hjem

Daily recommendations and active plan.

Måltider

Browse/filter recipes based on today’s offers.

Liste

Active shopping list.

Rute

Stores, distance, and savings.

Profil

Preferences, pantry, saved recipes, stores, restrictions.

Do not use Planlæg as a main tab. Too vague.

Do not use Gemt as a main tab. Saved recipes belong under Profil or inside Måltider.

Home screen

Home should show value immediately.

Not cuisine buttons first. That makes the user work before getting a reward.

Structure:

Top

KøbSmart
Tilbud opdateret i dag
Settings

Daily win card

Dagens bedste aftensmad

Kylling i rød karry
84 kr.
Spar 22 kr.
6/8 ingredienser fundet
Rute: 1.2 km
25 min

CTA:

Lav indkøbsplan

Quick filters

Small row:

Billigst
Kortest rute
Hurtigst
Familievenlig
Høj protein
Vegetar
Your preferences

Compact card:

Ingen svinekød
Halal
Allergi: soja
Har hjemme: ris, olie, løg

CTA:

Rediger

More meals

Cards:

Kylling i karry
Pasta uden svin
Mexicansk bowl
Thai suppe

Each card should show:

image
price
savings
route
time
ingredient match
Meal card structure

Every meal card should answer five questions instantly:

Do I want to eat this?
What does it cost?
How much do I save?
How annoying is the route?
Do I already have some ingredients?

Card:

Kylling i rød karry
84 kr.
Spar 22 kr.
6/8 ingredienser fundet
Rute: 1.2 km
25 min

Badges:

Føtex
Netto
Halal-venlig
Har ris hjemme

CTA:

Se plan

Not “Find måltider” once they’re already looking at meals.

Meal detail screen

This is where the app proves it isn’t bullshit.

Sections:

Header

Image
Title
Price
Savings
Time
Difficulty
Servings

Why this meal?

Vi foreslår den fordi kylling, kokosmælk og ris matcher dine præferencer, og flere ingredienser er på tilbud i dag.

Ingredient planner

Each ingredient row:

Kyllingebryst — 400g
Best option: Føtex — 32 kr. — spar 12 kr.
Alternatives:

Netto — 35 kr. — closer
Rema — 34 kr. — cheaper route

Actions:

Jeg har den hjemme
Skift butik
Skift ingrediens

This is where users choose cheaper vs closer.

Route mode toggle

Three options:

Billigst
Kortest rute
Balanceret

Default should be Balanceret.

Because sending someone to three stores to save 7 kr. is idiotic. The app should respect human time.

Route summary

Føtex + Netto
1.2 km
Spar 22 kr.

Smart note:

Netto tilføjer 0.8 km og sparer kun 5 kr. Vil du springe den over?

This is the killer feature. This makes the app feel intelligent.

CTA:

Lav indkøbsliste

Shopping list screen

The shopping list is generated from the active plan.

Group by store.

Føtex
Kyllingebryst — 400g — 32 kr. — spar 12 kr.
Karrypasta — 1 glas — 18 kr.
Netto
Kokosmælk — 400ml — 12 kr. — spar 5 kr.
Har hjemme
Ris
Olie
Løg

Sticky bottom bar:

Total: 84 kr.
Sparet: 22 kr.
Rute: 1.2 km

CTA:

Start rute

Important distinction:

Before shopping: checkbox means “I already have this”
During shopping: checkbox means “I bought this”

Do not use the same interaction for both without context. That causes confusion.

Route screen

The route screen should not just be “map.”

It should be a value calculation.

Show:

Best route
Føtex
+0.4 km
spar 12 kr.
Netto
+0.8 km
spar 10 kr.

Total:

1.2 km
22 kr. sparet

Actions:

Åbn i Maps
Spring butik over
Genberegn rute

If user skips Netto:

Ny rute: 0.6 km
Ny besparelse: 17 kr.

That’s useful. That’s addictive because it gives control.

Cook mode

Once all shopping items are ticked off:

Alt klar. Skal vi lave mad?

Then show recipe:

ingredients
steps
time
servings
notes
substitutions

Also show reward:

Du sparede 22 kr. på dette måltid.

Then:

Gem opskrift
Lav igen senere

This is the completion loop.

Saved recipes

Your idea here is good: saved recipes should update with current prices.

In Profile or Måltider, have:

Saved recipes

Each saved recipe card shows:

current estimated price
current savings
cheapest route today
offer expiry
“cheaper than usual” badge

Example:

Pasta uden svin
I dag: 62 kr.
Spar 15 kr.
Netto 0.8 km
Billigere end sidst

This is strong because it creates a reason to reopen the app.

Notifications later:

Din gemte kylling i karry er 18 kr. billigere i dag.

That’s useful. Not spam.

What repeats each time vs lives in profile

Use this model:

Thing	Lives in profile?	Adjustable per meal?	Notes
Dietary restrictions	Yes	Rarely	Should be persistent.
Allergies	Yes	Rarely	Never make user repeat.
Cuisine preferences	Yes	Yes	Profile stores favorites; session changes mood.
Store chains	Yes	Yes	Profile default; per-plan override.
Location	Yes	Yes	Home location default; allow “shop near me.”
Pantry staples	Yes	Yes	Profile memory + per-plan tick-off.
Servings	Yes	Yes	Default household size, adjustable.
Budget mode	Yes	Yes	Cheapest / closest / balanced.
Saved recipes	Yes	Repriced daily	Store recipe, not fixed price.
Active shopping list	No	Yes	Session-specific.
Route	No	Yes	Generated per plan.

This is the architecture. Anything permanent goes in Profile. Anything about tonight stays in the active plan.

App state model

You need these states:

No profile completed

Show onboarding.

Profile completed, no active plan

Show daily meal recommendations.

Meal selected, no shopping list

Show meal detail + planner.

Shopping list created

Show list + route.

Shopping in progress

Show checklist + current route stop.

Shopping complete

Show cook mode.

Meal cooked / plan completed

Show savings summary + save recipe.

That gives the app a clear lifecycle.

Data model, conceptually

You need these objects:

UserProfile
dietary restrictions
allergies
preferred cuisines
preferred stores
location
servings
pantry staples
route preference
Recipe
title
cuisine
ingredients
amounts
substitutions
steps
prep time
tags
Offer
product
store
chain
price
normal price
discount
expiry
location availability
MealPlan
recipe
selected offers
pantry exclusions
chosen stores
total price
savings
route
shopping items
status
SavedRecipe
recipe ID
user notes
last cooked
current price snapshot
current savings snapshot
MVP cut

Do not build everything at once. Build this first:

onboarding preferences
recipe suggestions from offer data
meal detail with ingredient/offer matching
route mode: cheapest / closest / balanced
shopping list
pantry tick-off recalculation
cook mode
saved recipes that reprice daily

Skip for now:

full pantry inventory
barcode scanning
account sharing
household collaboration
advanced nutrition
real-time stock
loyalty card integration
AI recipe generation
complex maps inside the app

You can use external Maps links first. Don’t build Google Maps cosplay unless the core works.

The addictive loop

The loop should be:

User opens app

“Dagens bedste måltid er klar.”

User sees value

“Spar 22 kr. — rute 1.2 km.”

User tweaks

“Jeg har ris hjemme.”

App recalculates

“Ny pris: 74 kr.”

User shops

check items off

User finishes

“Du sparede 22 kr.”

App builds memory

saved recipe gets cheaper next time

This is the habit.

Not scrolling. Not fake streaks. Actual life utility.

Final architecture verdict

Your simplest journey is correct, but don’t make the user rebuild it every time.

The app should work like this:

Profile stores the rules.
Home shows today’s best meals.
Meal detail lets the user choose cheapest vs closest.
List turns the recipe into shopping.
Route makes the shopping efficient.
Cook mode completes the loop.
Saved recipes keep updating with current offers.

That is clean. That is shippable. That is a real product.