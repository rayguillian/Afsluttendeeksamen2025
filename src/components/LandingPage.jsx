import { useState } from 'react';
import { 
  ChevronRight, 
  ShoppingCart, 
  Route, 
  Calculator, 
  ChefHat, 
  PiggyBank, 
  ArrowRight,
  Star
} from 'lucide-react';
import OnboardingFlow from './onboarding/OnboardingFlow';
import IPhoneFrame from './onboarding/IPhoneFrame';

// Testimonial component
const Testimonial = ({ text, author, role }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
    <div className="flex gap-2 mb-2">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
      ))}
    </div>
    <p className="text-gray-600 mb-4">{text}</p>
    <div>
      <p className="font-semibold">{author}</p>
      <p className="text-sm text-gray-500">{role}</p>
    </div>
  </div>
);

const KobSmartMascot = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <linearGradient id="mascotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:"#3B82F6", stopOpacity:1}}/>
        <stop offset="100%" style={{stopColor:"#60A5FA", stopOpacity:1}}/>
      </linearGradient>
    </defs>
    
    <g id="mascot">
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0; 0,-10; 0,0"
        dur="3s"
        repeatCount="indefinite"
        additive="sum"
      />
      
      <path d="M40,80 L160,80 L140,180 L60,180 Z" fill="url(#mascotGradient)">
        <animate
          attributeName="d"
          values="
            M40,80 L160,80 L140,180 L60,180 Z;
            M45,80 L165,80 L145,180 L65,180 Z;
            M40,80 L160,80 L140,180 L60,180 Z"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>
      
      <path d="M60,80 C60,40 140,40 140,80" 
        fill="none" 
        stroke="url(#mascotGradient)" 
        strokeWidth="12"
        strokeLinecap="round">
        <animate
          attributeName="d"
          values="
            M60,80 C60,40 140,40 140,80;
            M65,80 C65,35 135,35 135,80;
            M60,80 C60,40 140,40 140,80"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>
      
      <g id="eyes">
        <circle cx="85" cy="120" r="8" fill="white"/>
        <circle cx="85" cy="120" r="4" fill="#1E3A8A">
          <animate
            attributeName="cy"
            values="120;122;120"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        
        <circle cx="115" cy="120" r="8" fill="white"/>
        <circle cx="115" cy="120" r="4" fill="#1E3A8A">
          <animate
            attributeName="cy"
            values="120;122;120"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      
      <path d="M85,140 Q100,155 115,140" 
        fill="none" 
        stroke="white" 
        strokeWidth="4"
        strokeLinecap="round">
        <animate
          attributeName="d"
          values="
            M85,140 Q100,155 115,140;
            M85,142 Q100,157 115,142;
            M85,140 Q100,155 115,140"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  </svg>
);

export default function LandingPage() {
  const [expandedOption, setExpandedOption] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleOption = (option) => {
    setExpandedOption(expandedOption === option ? null : option);
  };

  // Close modal when clicking outside
  const handleModalClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                <KobSmartMascot />
              </div>
              <div className="text-2xl font-bold text-blue-600">KøbSmart</div>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#hvordan" className="text-gray-600 hover:text-blue-600 transition-colors">Sådan virker det</a>
              <a href="#valg" className="text-gray-600 hover:text-blue-600 transition-colors">Valgmuligheder</a>
              <a href="#download" className="text-gray-600 hover:text-blue-600 transition-colors">Download</a>
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-all transform hover:scale-105">
              Kom i gang
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
                Din smarte{' '}
                <span className="text-blue-600">
                  indkøbs&shy;assistent
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto lg:mx-0 animate-fade-in-delay">
                Spar 20-30% på dine dagligvarer med Danmarks mest intelligente prissammenlignings-app.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center">
                  Start med at spare
                  <ChevronRight className="ml-2" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex justify-center items-center">
              <div className="w-64 h-64 md:w-96 md:h-96">
                <KobSmartMascot />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="hvordan" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Spar penge på to måder</h2>
          
          {/* Option 1: Recipe Based */}
          <div className="mb-20">
            <button 
              onClick={() => toggleOption('recipe')}
              className="w-full flex items-center gap-4 md:hidden bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:border-blue-100 transition-all"
            >
              <div className="bg-blue-600 rounded-full p-3">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold flex-1 text-left">Opskrift-baseret</h3>
              <ChevronRight 
                className={`w-6 h-6 text-gray-400 transition-transform ${
                  expandedOption === 'recipe' ? 'rotate-90' : ''
                }`}
              />
            </button>
            
            <div className={`md:flex md:flex-row gap-8 items-center ${
              expandedOption === 'recipe' ? 'block mt-4 bg-white p-6 rounded-xl shadow-md' : 'hidden md:flex'
            }`}>
              <div className="flex-1 space-y-6 order-1 md:order-1">
                <div className="hidden md:flex items-center gap-4">
                  <div className="bg-blue-600 rounded-full p-3 transform hover:scale-110 transition-transform">
                    <ChefHat className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Opskrift-baseret</h3>
                </div>
                <div className="space-y-4 md:ml-12">
                  <div className="flex gap-4 items-start">
                    <span className="text-gray-400 mt-1">1.</span>
                    <div>
                      <p className="text-gray-600">Vælg dine madpræferencer:</p>
                      <ul className="text-gray-600 list-disc list-inside ml-4 mt-2">
              
                        <li>Køkkentype (dansk, italiensk, thai)</li>
                        <li>Tilberedningstid (hurtig, normal, langsom)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-400">2.</span>
                    <p className="text-gray-600">Få skrædersydet opskrifter der matcher dine præferencer</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-400">3.</span>
                    <p className="text-gray-600">Få den billigste indkøbsrute til ingredienserne</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 order-2 md:order-1 mt-6 md:mt-0">
                {/* Desktop View */}
                <div className="hidden md:block">
                  <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <IPhoneFrame />
                    <p className="text-sm text-gray-500 text-center mt-2">Se hvordan det virker</p>
                  </div>
                </div>
                
                {/* Mobile View with Modal */}
                <div className="md:hidden">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-white group"
                  >
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="text-xl font-medium">Oplev appen</span>
                      <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm text-blue-100">Find de bedste tilbud</p>
                  </button>
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
            <button 
              onClick={() => toggleOption('shopping')}
              className="w-full flex items-center gap-4 md:hidden bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:border-blue-100 transition-all mt-8"
            >
              <div className="bg-blue-600 rounded-full p-3">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold flex-1 text-left">Indkøbsliste-baseret</h3>
              <ChevronRight 
                className={`w-6 h-6 text-gray-400 transition-transform ${
                  expandedOption === 'shopping' ? 'rotate-90' : ''
                }`}
              />
            </button>
            
            <div className={`md:flex md:flex-row gap-8 items-center ${
              expandedOption === 'shopping' ? 'block mt-4 bg-white p-6 rounded-xl shadow-md' : 'hidden md:flex'
            }`}>
              <div className="flex-1 space-y-6 order-1 md:order-2">
                <div className="hidden md:flex items-center gap-4">
                  <div className="bg-blue-600 rounded-full p-3 transform hover:scale-110 transition-transform">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Indkøbsliste-baseret</h3>
                </div>
                <div className="space-y-4 md:ml-12">
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
              <div className="flex-1 order-2 md:order-1 mt-6 md:mt-0">
                <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-100 rounded-xl aspect-video mb-4"></div>
                  <p className="text-sm text-gray-500 text-center">Se hvordan det virker</p>
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
            <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-md transition-all transform hover:scale-105">
              <Route className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Smart Ruteplanlægning</h3>
              <p className="text-gray-600">Optimal rute mellem butikker, så du sparer både tid og benzin.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-md transition-all transform hover:scale-105">
              <Calculator className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Live Prissammenligning</h3>
              <p className="text-gray-600">Sammenlign priser fra alle større danske supermarkeder i realtid.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-md transition-all transform hover:scale-105">
              <PiggyBank className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Garanteret Besparelse</h3>
              <p className="text-gray-600">Gennemsnitlig besparelse på 20-30% på din indkøbsregning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Det siger vores brugere</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Testimonial 
              text="KøbSmart har gjort det så meget nemmere at handle ind til min familie. Vi sparer både tid og penge!"
              author="Marianne Jensen"
              role="Mor til to"
            />
            <Testimonial 
              text="Som studerende er det guld værd at kunne finde de bedste tilbud uden at skulle tjekke flere apps."
              author="Pernille Nielsen"
              role="Studerende"
            />
            <Testimonial 
              text="Jeg sparer nemt 800 kr om måneden på mine indkøb. Det er simpelthen genialt!"
              author="Anders Pedersen"
              role="Far til tre"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Ofte stillede spørgsmål</h2>
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Hvor får I priserne fra?</h3>
              <p className="text-gray-600">Vi henter priser direkte fra danske supermarkeders databaser og opdaterer dem løbende.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Hvor ofte opdateres priserne?</h3>
              <p className="text-gray-600">Priserne opdateres flere gange dagligt for at sikre, at du altid får de mest aktuelle priser.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Hvilke butikker er med?</h3>
              <p className="text-gray-600">Vi samarbejder med alle større danske supermarkeder, including Netto, Føtex, Bilka, Rema 1000, Lidl, og flere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="download" className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 mb-8">
              <KobSmartMascot />
            </div>
            <h2 className="text-4xl font-bold mb-6">Klar til at spare penge?</h2>
            <p className="text-xl mb-8 opacity-90">Tilslut dig tusindvis af smarte forbrugere, der sparer penge hver dag.</p>
            <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg hover:bg-gray-100 transition-all transform hover:scale-105 flex items-center justify-center">
              Download KøbSmart
              <ArrowRight className="ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Mobile Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 md:hidden animate-fade-in"
          onClick={handleModalClick}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transform-gpu animate-scale-up">
            <div className="relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white transition-colors"
                aria-label="Luk demo"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <IPhoneFrame />
            </div>
          </div>
        </div>
      )}

      <style jsx="true" global="true">{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-up {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
