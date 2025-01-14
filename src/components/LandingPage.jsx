import React from 'react';
import { 
  ChevronRight, 
  ShoppingCart, 
  Route, 
  Calculator, 
  ChefHat, 
  PiggyBank, 
  ArrowRight,
  Clock,
  List,
  MapPin,
  ShoppingBasket
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      {/* Bubble Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
            </filter>
            
            <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          <g filter="url(#blur)">
            <circle cx="200" cy="300" r="100" fill="url(#bubbleGradient)">
              <animate attributeName="cy" from="600" to="-100" dur="20s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="200;220;200" dur="10s" repeatCount="indefinite"/>
              <animate attributeName="r" values="100;120;100" dur="5s" repeatCount="indefinite"/>
            </circle>
            
            <circle cx="600" cy="400" r="60" fill="url(#bubbleGradient)">
              <animate attributeName="cy" from="600" to="-60" dur="15s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="600;620;600" dur="7s" repeatCount="indefinite"/>
              <animate attributeName="r" values="60;70;60" dur="4s" repeatCount="indefinite"/>
            </circle>
            
            <circle cx="400" cy="300" r="30" fill="url(#bubbleGradient)">
              <animate attributeName="cy" from="600" to="-30" dur="12s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="400;420;400" dur="6s" repeatCount="indefinite"/>
              <animate attributeName="r" values="30;35;30" dur="3s" repeatCount="indefinite"/>
            </circle>
          </g>
        </svg>
      </div>

      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-blue-600">KøbSmart</div>
            <div className="hidden md:flex space-x-8">
              <a href="#hvordan" className="text-gray-600 hover:text-blue-600">Sådan virker det</a>
              <a href="#valg" className="text-gray-600 hover:text-blue-600">Valgmuligheder</a>
              <a href="#download" className="text-gray-600 hover:text-blue-600">Download</a>
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors">
              Kom i gang
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Spar penge på <span className="text-blue-600">alle</span> dagligvarer
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Danmarks smarteste indkøbsassistent. Få AI-genererede opskrifter og find de billigste dagligvarer i nærheden.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              Start med at spare
              <ChevronRight className="ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="hvordan" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Spar penge på to måder</h2>
          
          {/* Option 1: Recipe Based */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 rounded-full p-3">
                    <ChefHat className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Opskrift-baseret</h3>
                </div>
                <div className="space-y-4 ml-12">
                  <div className="flex gap-4 items-start">
                    <span className="text-gray-400 mt-1">1.</span>
                    <div>
                      <p className="text-gray-600">Vælg dine madpræferencer:</p>
                      <ul className="text-gray-600 list-disc list-inside ml-4 mt-2">
                        <li>Kosttype (vegansk, vegetarisk, alting)</li>
                        <li>Køkkentype (dansk, italiensk, asiatisk)</li>
                        <li>Tilberedningstid (hurtig, normal, langsom)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-400">2.</span>
                    <p className="text-gray-600">Få AI-genererede opskrifter der matcher dine præferencer</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-400">3.</span>
                    <p className="text-gray-600">Få den billigste indkøbsrute til ingredienserne</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                  <div className="bg-gray-100 rounded-xl aspect-video mb-4"></div>
                  <p className="text-sm text-gray-500 text-center">Se hvordan det virker</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center my-12">
            <div className="w-full h-px bg-gray-200"></div>
            <span className="px-4 text-gray-500">eller</span>
            <div className="w-full h-px bg-gray-200"></div>
          </div>

          {/* Option 2: Shopping List Based */}
          <div>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 order-2 md:order-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                  <div className="bg-gray-100 rounded-xl aspect-video mb-4"></div>
                  <p className="text-sm text-gray-500 text-center">Se hvordan det virker</p>
                </div>
              </div>
              <div className="flex-1 space-y-6 order-1 md:order-2">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 rounded-full p-3">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Indkøbsliste-baseret</h3>
                </div>
                <div className="space-y-4 ml-12">
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-400">1.</span>
                    <p className="text-gray-600">Indtast din indkøbsliste</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="text-gray-400 mt-1">2.</span>
                    <div>
                      <p className="text-gray-600">Angiv dine præferencer:</p>
                      <ul className="text-gray-600 list-disc list-inside ml-4 mt-2">
                        <li>Hvor langt du vil køre/gå</li>
                        <li>Hvor mange butikker du vil besøge</li>
                        <li>Foretrukne supermarkeder</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-400">3.</span>
                    <p className="text-gray-600">Få den billigste indkøbsrute</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="valg" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <Route className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Smart Ruteplanlægning</h3>
              <p className="text-gray-600">Optimal rute mellem butikker, så du sparer både tid og benzin.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl">
              <Calculator className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Live Prissammenligning</h3>
              <p className="text-gray-600">Sammenlign priser fra alle større danske supermarkeder i realtid.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl">
              <PiggyBank className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Garanteret Besparelse</h3>
              <p className="text-gray-600">Gennemsnitlig besparelse på 20-30% på din indkøbsregning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Ofte stillede spørgsmål</h2>
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2">Hvor får I priserne fra?</h3>
              <p className="text-gray-600">Vi henter priser direkte fra danske supermarkeders databaser og opdaterer dem løbende.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2">Hvor ofte opdateres priserne?</h3>
              <p className="text-gray-600">Priserne opdateres flere gange dagligt for at sikre, at du altid får de mest aktuelle priser.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2">Hvilke butikker er med?</h3>
              <p className="text-gray-600">Vi samarbejder med alle større danske supermarkeder, including Netto, Føtex, Bilka, Rema 1000, Lidl, og flere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="download" className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Klar til at spare penge?</h2>
          <p className="text-xl mb-8 opacity-90">Tilslut dig tusindvis af smarte forbrugere, der sparer penge hver dag.</p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg hover:bg-gray-100 transition-colors flex items-center justify-center mx-auto">
            Download KøbSmart
            <ArrowRight className="ml-2" />
          </button>
        </div>
      </section>
    </div>
  );
}
