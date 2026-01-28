import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useLucideIcons } from '../hooks/useLucideIcons';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/DatabaseService';
import { useToast } from '../hooks/useToast';
import { CardapioSemanal } from '../types';
import LoadingModal from './LoadingModal';
import ExtraDateInput from './ExtraDateInput';
import criancasIcon from '../images/criancas.png';
import adolescentesIcon from '../images/adolescentes.png';
import adultosIcon from '../images/adultos.png';

interface CardapioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  cardapioToEdit?: CardapioSemanal | null;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface MealData {
  colacao: {
    solido: string;
    liquido: string;
    frutas: string;
    comensaisPequenos: number;
    comensaisAdolescentes: number;
    comensaisAdultos: number;
  };
  almoco: {
    acompanhamento1: string;
    acompanhamento2: string;
    complemento: string;
    pratoPrincipal: string;
    guarnicao: string;
    salada: string;
    sobremesa: string;
    liquido: string;
    comensaisPequenos: number;
    comensaisAdolescentes: number;
    comensaisAdultos: number;
  };
  lanche: {
    solido: string;
    liquido: string;
    frutas: string;
    comensaisPequenos: number;
    comensaisAdolescentes: number;
    comensaisAdultos: number;
  };
  jantar: {
    acompanhamento1: string;
    acompanhamento2: string;
    complemento: string;
    pratoPrincipal: string;
    guarnicao: string;
    salada: string;
    sobremesa: string;
    liquido: string;
    comensaisPequenos: number;
    comensaisAdolescentes: number;
    comensaisAdultos: number;
  };
}

interface DayConfig {
  isHoliday: boolean;
  enabledMeals: {
    colacao: boolean;
    almoco: boolean;
    lanche: boolean;
    jantar: boolean;
  };
  meals: MealData;
}

interface Preparacao {
  id: string;
  nome: string;
  tipo: string;
  valor_per_capita: number;
  modo_preparo?: string;
  refeicoes_presente: string[];
  default_preparation: boolean;
  created_by?: string;
}

const CardapioModal: React.FC<CardapioModalProps> = ({ isOpen, onClose, onSave, cardapioToEdit }) => {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [generatedDays, setGeneratedDays] = useState<Date[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Store configuration for each day
  const [daysConfig, setDaysConfig] = useState<Record<number, DayConfig>>({});
  
  // Store preparações
  const [preparacoes, setPreparacoes] = useState<Preparacao[]>([]);
  const [loadingPreparacoes, setLoadingPreparacoes] = useState(false);
  
  // State for collapsing meal cards (default: false = expanded)
  const [colacaoCollapsed] = useState(false);
  const [almocoCollapsed] = useState(false);
  const [lancheCollapsed] = useState(false);
  const [jantarCollapsed] = useState(false);
  
  // Loading state for cardapio creation
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingCardapioData, setLoadingCardapioData] = useState(false);
  
  // Extra date state
  const [selectedExtraDate, setSelectedExtraDate] = useState<Date | null>(null);
  const [extraDatesAdded, setExtraDatesAdded] = useState<Date[]>([]);
  
  // Change detection state
  const [initialDaysConfig, setInitialDaysConfig] = useState<Record<number, DayConfig>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  
  // Caloric calculation state
  const [calculatedCalories, setCalculatedCalories] = useState<Record<number, {
    colacao?: { pequenos: number; adolescentes: number; adultos: number };
    almoco?: { pequenos: number; adolescentes: number; adultos: number };
    lanche?: { pequenos: number; adolescentes: number; adultos: number };
    jantar?: { pequenos: number; adolescentes: number; adultos: number };
  }>>({});
  
  const { profile } = useAuth();
  const { showError, showSuccess } = useToast();
  // Initialize Lucide icons
  useLucideIcons([isOpen, dateRange, generatedDays, activeTab, daysConfig, colacaoCollapsed, almocoCollapsed, lancheCollapsed, jantarCollapsed]);

  // Load preparações when modal opens
  useEffect(() => {
    if (isOpen && profile?.id) {
      loadPreparacoes();
    }
  }, [isOpen, profile?.id]);

  // Handle edit mode
  useEffect(() => {
    if (isOpen && cardapioToEdit) {
      setIsEditMode(true);
      loadCardapioData(cardapioToEdit);
    } else {
      setIsEditMode(false);
    }
  }, [isOpen, cardapioToEdit]);

  // Detect changes in daysConfig (only in edit mode)
  useEffect(() => {
    if (isEditMode && Object.keys(initialDaysConfig).length > 0) {
      const hasChanges = JSON.stringify(daysConfig) !== JSON.stringify(initialDaysConfig);
      setHasUnsavedChanges(hasChanges);
    }
  }, [daysConfig, initialDaysConfig, isEditMode]);

  // Auto-calculate calories for Colação when dropdowns change
  useEffect(() => {
    const calculateColacaoCalories = async () => {
      const currentConfig = daysConfig[activeTab];
      
      // Only calculate if:
      // 1. We have a valid day config
      // 2. It's not a holiday
      // 3. Colação is enabled
      // 4. At least one preparação is selected
      if (!currentConfig || currentConfig.isHoliday || !currentConfig.enabledMeals.colacao) {
        return;
      }

      const preparacaoIds = [
        currentConfig.meals.colacao.solido,
        currentConfig.meals.colacao.liquido,
        currentConfig.meals.colacao.frutas,
      ].filter(Boolean);

      // Only calculate if there's at least one preparação selected
      if (preparacaoIds.length === 0) {
        // Clear calories if no preparações are selected
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            colacao: undefined,
          },
        }));
        return;
      }

      try {
        const colacaoCalories = await calculateMealCalories(preparacaoIds);
        
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            colacao: colacaoCalories,
          },
        }));
      } catch (error) {
        console.error('Error auto-calculating Colação calories:', error);
      }
    };

    calculateColacaoCalories();
  }, [
    activeTab,
    daysConfig[activeTab]?.meals.colacao.solido,
    daysConfig[activeTab]?.meals.colacao.liquido,
    daysConfig[activeTab]?.meals.colacao.frutas,
    daysConfig[activeTab]?.enabledMeals.colacao,
    daysConfig[activeTab]?.isHoliday,
  ]);

  // Auto-calculate calories for Almoço when dropdowns change
  useEffect(() => {
    const calculateAlmocoCalories = async () => {
      const currentConfig = daysConfig[activeTab];
      
      if (!currentConfig || currentConfig.isHoliday || !currentConfig.enabledMeals.almoco) {
        return;
      }

      const preparacaoIds = [
        currentConfig.meals.almoco.acompanhamento1,
        currentConfig.meals.almoco.acompanhamento2,
        currentConfig.meals.almoco.complemento,
        currentConfig.meals.almoco.pratoPrincipal,
        currentConfig.meals.almoco.guarnicao,
        currentConfig.meals.almoco.salada,
        currentConfig.meals.almoco.sobremesa,
        currentConfig.meals.almoco.liquido,
      ].filter(Boolean);

      if (preparacaoIds.length === 0) {
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            almoco: undefined,
          },
        }));
        return;
      }

      try {
        const almocoCalories = await calculateMealCalories(preparacaoIds);
        
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            almoco: almocoCalories,
          },
        }));
      } catch (error) {
        console.error('Error auto-calculating Almoço calories:', error);
      }
    };

    calculateAlmocoCalories();
  }, [
    activeTab,
    daysConfig[activeTab]?.meals.almoco.acompanhamento1,
    daysConfig[activeTab]?.meals.almoco.acompanhamento2,
    daysConfig[activeTab]?.meals.almoco.complemento,
    daysConfig[activeTab]?.meals.almoco.pratoPrincipal,
    daysConfig[activeTab]?.meals.almoco.guarnicao,
    daysConfig[activeTab]?.meals.almoco.salada,
    daysConfig[activeTab]?.meals.almoco.sobremesa,
    daysConfig[activeTab]?.meals.almoco.liquido,
    daysConfig[activeTab]?.enabledMeals.almoco,
    daysConfig[activeTab]?.isHoliday,
  ]);

  // Auto-calculate calories for Lanche when dropdowns change
  useEffect(() => {
    const calculateLancheCalories = async () => {
      const currentConfig = daysConfig[activeTab];
      
      if (!currentConfig || currentConfig.isHoliday || !currentConfig.enabledMeals.lanche) {
        return;
      }

      const preparacaoIds = [
        currentConfig.meals.lanche.solido,
        currentConfig.meals.lanche.liquido,
        currentConfig.meals.lanche.frutas,
      ].filter(Boolean);

      if (preparacaoIds.length === 0) {
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            lanche: undefined,
          },
        }));
        return;
      }

      try {
        const lancheCalories = await calculateMealCalories(preparacaoIds);
        
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            lanche: lancheCalories,
          },
        }));
      } catch (error) {
        console.error('Error auto-calculating Lanche calories:', error);
      }
    };

    calculateLancheCalories();
  }, [
    activeTab,
    daysConfig[activeTab]?.meals.lanche.solido,
    daysConfig[activeTab]?.meals.lanche.liquido,
    daysConfig[activeTab]?.meals.lanche.frutas,
    daysConfig[activeTab]?.enabledMeals.lanche,
    daysConfig[activeTab]?.isHoliday,
  ]);

  // Auto-calculate calories for Jantar when dropdowns change
  useEffect(() => {
    const calculateJantarCalories = async () => {
      const currentConfig = daysConfig[activeTab];
      
      if (!currentConfig || currentConfig.isHoliday || !currentConfig.enabledMeals.jantar) {
        return;
      }

      const preparacaoIds = [
        currentConfig.meals.jantar.acompanhamento1,
        currentConfig.meals.jantar.acompanhamento2,
        currentConfig.meals.jantar.complemento,
        currentConfig.meals.jantar.pratoPrincipal,
        currentConfig.meals.jantar.guarnicao,
        currentConfig.meals.jantar.salada,
        currentConfig.meals.jantar.sobremesa,
        currentConfig.meals.jantar.liquido,
      ].filter(Boolean);

      if (preparacaoIds.length === 0) {
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            jantar: undefined,
          },
        }));
        return;
      }

      try {
        const jantarCalories = await calculateMealCalories(preparacaoIds);
        
        setCalculatedCalories(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            jantar: jantarCalories,
          },
        }));
      } catch (error) {
        console.error('Error auto-calculating Jantar calories:', error);
      }
    };

    calculateJantarCalories();
  }, [
    activeTab,
    daysConfig[activeTab]?.meals.jantar.acompanhamento1,
    daysConfig[activeTab]?.meals.jantar.acompanhamento2,
    daysConfig[activeTab]?.meals.jantar.complemento,
    daysConfig[activeTab]?.meals.jantar.pratoPrincipal,
    daysConfig[activeTab]?.meals.jantar.guarnicao,
    daysConfig[activeTab]?.meals.jantar.salada,
    daysConfig[activeTab]?.meals.jantar.sobremesa,
    daysConfig[activeTab]?.meals.jantar.liquido,
    daysConfig[activeTab]?.enabledMeals.jantar,
    daysConfig[activeTab]?.isHoliday,
  ]);

  const loadPreparacoes = async () => {
    if (!profile?.id) return;
    
    setLoadingPreparacoes(true);
    try {
      const data = await DatabaseService.getPreparacoes(profile.id);
      setPreparacoes(data || []);
    } catch (error) {
      console.error('Error loading preparações:', error);
      setPreparacoes([]);
    } finally {
      setLoadingPreparacoes(false);
    }
  };

  const loadCardapioData = async (cardapio: CardapioSemanal) => {
    setLoadingCardapioData(true);
    try {
      console.log('🔍 [FASE 0 - DEBUG] ========================================');
      console.log('🔍 [FASE 0] Step 1: Loading cardapio data for:', cardapio);
      
      // Set basic date range from cardapio semanal
      // Parse dates correctly to avoid timezone issues
      const startDateParts = cardapio.data_inicio.split('-').map(Number);
      const endDateParts = cardapio.data_fim.split('-').map(Number);
      const startDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
      const endDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
      
      console.log('🔍 [FASE 0] Step 2: Date range set:', { startDate, endDate });
      console.log('🔍 [FASE 0] Step 2.1: Original strings:', { data_inicio: cardapio.data_inicio, data_fim: cardapio.data_fim });
      setDateRange({ startDate, endDate });
      
      // Generate days array
      const days = generateDaysArray(startDate, endDate);
      console.log('🔍 [FASE 0] Step 3: Generated days array:', days.length, 'days');
      console.log('🔍 [FASE 0] Days:', days.map(d => d.toISOString().split('T')[0]));
      setGeneratedDays(days);
      setActiveTab(0);
      
      // Load complete cardapio data
      console.log('🔍 [FASE 0] Step 4: Calling getCardapioCompleto with ID:', cardapio.id);
      const cardapioCompleto = await DatabaseService.getCardapioCompleto(cardapio.id);
      console.log('🔍 [FASE 0] Step 5: Cardapio completo loaded:', cardapioCompleto);
      
      if (cardapioCompleto && cardapioCompleto.cardapios_do_dia) {
        console.log('🔍 [FASE 0] Step 6: Found cardapios_do_dia:', cardapioCompleto.cardapios_do_dia.length);
        console.log('🔍 [FASE 0] Cardapios do dia data:', cardapioCompleto.cardapios_do_dia.map((c: any) => ({ data: c.data, refeicoes: c.refeicoes?.length || 0 })));
        
        // Identify extra dates (dates outside the original period)
        const extraDates: Date[] = [];
        const allDatesFromDB = cardapioCompleto.cardapios_do_dia.map((c: any) => {
          const [year, month, day] = c.data.split('-').map(Number);
          return new Date(year, month - 1, day);
        });
        
        allDatesFromDB.forEach((dbDate: Date) => {
          const isWithinOriginalPeriod = dbDate >= startDate && dbDate <= endDate;
          if (!isWithinOriginalPeriod) {
            extraDates.push(dbDate);
          }
        });
        
        console.log('🔍 [FASE 0] Step 6.1: Extra dates found:', extraDates.length);
        console.log('🔍 [FASE 0] Extra dates:', extraDates.map(d => d.toISOString().split('T')[0]));
        
        // Update state with extra dates
        setExtraDatesAdded(extraDates);
        
        // Combine original days with extra dates and sort chronologically
        const allDates = [...days, ...extraDates].sort((a, b) => a.getTime() - b.getTime());
        setGeneratedDays(allDates);
        
        // Convert loaded data to our internal format
        const loadedDaysConfig: Record<number, DayConfig> = {};
        
        allDates.forEach((day, index) => {
          const dayString = day.toISOString().split('T')[0];
          const cardapioDoDia = cardapioCompleto.cardapios_do_dia.find(
            (c: any) => c.data === dayString
          );
          
          console.log(`🔍 [FASE 0] Day ${index} (${dayString}):`, cardapioDoDia ? '✅ FOUND' : '❌ NOT FOUND');
          if (cardapioDoDia) {
            console.log(`🔍 [FASE 0]   - Refeicoes count: ${cardapioDoDia.refeicoes?.length || 0}`);
            console.log(`🔍 [FASE 0]   - Refeicoes data:`, cardapioDoDia.refeicoes);
          }
          
          if (cardapioDoDia) {
            // This day exists in the database
            const dayConfig: DayConfig = {
              isHoliday: false,
              enabledMeals: {
                colacao: false,
                almoco: false,
                lanche: false,
                jantar: false,
              },
              meals: {
                colacao: { 
                  solido: '', 
                  liquido: '', 
                  frutas: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
                almoco: { 
                  acompanhamento1: '', 
                  acompanhamento2: '', 
                  complemento: '', 
                  pratoPrincipal: '', 
                  guarnicao: '', 
                  salada: '', 
                  sobremesa: '',
                  liquido: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
                lanche: { 
                  solido: '', 
                  liquido: '', 
                  frutas: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
                jantar: { 
                  acompanhamento1: '', 
                  acompanhamento2: '', 
                  complemento: '', 
                  pratoPrincipal: '', 
                  guarnicao: '', 
                  salada: '', 
                  sobremesa: '',
                  liquido: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
              },
            };
            // Check if this day has refeicoes
            if (cardapioDoDia.refeicoes && cardapioDoDia.refeicoes.length > 0) {
            
            console.log(`🔍 [FASE 0]   - Processing ${cardapioDoDia.refeicoes.length} refeicoes...`);
            
            // Process each refeicao
            cardapioDoDia.refeicoes.forEach((refeicao: any, refIndex: number) => {
              console.log(`🔍 [FASE 0]     Refeicao ${refIndex}: tipo="${refeicao.tipo}", comensais: P=${refeicao.comensais_pequenos} A=${refeicao.comensais_adolescentes} Ad=${refeicao.comensais_adultos}`);
              
              // Convert database meal type to internal format (remove accents)
              let mealType: keyof DayConfig['enabledMeals'] = refeicao.tipo;
              if (refeicao.tipo === 'colação') mealType = 'colacao';
              if (refeicao.tipo === 'almoço') mealType = 'almoco';
              // lanche and jantar remain the same
              
              console.log(`🔍 [FASE 0]     Mapped tipo: "${refeicao.tipo}" → "${mealType}"`);
              
              // Enable this meal
              dayConfig.enabledMeals[mealType] = true;
              
              // Set comensais
              if (dayConfig.meals[mealType]) {
                (dayConfig.meals[mealType] as any).comensaisPequenos = refeicao.comensais_pequenos || 0;
                (dayConfig.meals[mealType] as any).comensaisAdolescentes = refeicao.comensais_adolescentes || 0;
                (dayConfig.meals[mealType] as any).comensaisAdultos = refeicao.comensais_adultos || 0;
                console.log(`🔍 [FASE 0]     Comensais set for ${mealType}`);
              }
              
              // Process preparacoes for this refeicao
              console.log(`🔍 [FASE 0]     Processing ${refeicao.preparacoes?.length || 0} preparacoes...`);
              refeicao.preparacoes.forEach((refeicaoPreparacao: any, prepIndex: number) => {
                const preparacao = refeicaoPreparacao.preparacoes;
                console.log(`🔍 [FASE 0]       Preparacao ${prepIndex}:`, preparacao ? `id=${preparacao.id}, nome="${preparacao.nome}", tipo="${preparacao.tipo}"` : 'NULL');
                
                if (preparacao && dayConfig.meals[mealType]) {
                  const tipo = preparacao.tipo;
                  
                  // Map preparacao tipo to meal field
                  if (mealType === 'colacao' || mealType === 'lanche') {
                    if (tipo === 'sólido') {
                      (dayConfig.meals[mealType] as any).solido = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.solido = ${preparacao.id}`);
                    } else if (tipo === 'líquido') {
                      (dayConfig.meals[mealType] as any).liquido = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.liquido = ${preparacao.id}`);
                    } else if (tipo === 'frutas') {
                      (dayConfig.meals[mealType] as any).frutas = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.frutas = ${preparacao.id}`);
                    }
                  } else if (mealType === 'almoco' || mealType === 'jantar') {
                    if (tipo === 'acompanhamento') {
                      // For acompanhamento, we need to check if acompanhamento1 is already filled
                      if (!(dayConfig.meals[mealType] as any).acompanhamento1) {
                        (dayConfig.meals[mealType] as any).acompanhamento1 = preparacao.id;
                        console.log(`🔍 [FASE 0]         Mapped to ${mealType}.acompanhamento1 = ${preparacao.id}`);
                      } else {
                        (dayConfig.meals[mealType] as any).acompanhamento2 = preparacao.id;
                        console.log(`🔍 [FASE 0]         Mapped to ${mealType}.acompanhamento2 = ${preparacao.id}`);
                      }
                    } else if (tipo === 'complemento') {
                      (dayConfig.meals[mealType] as any).complemento = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.complemento = ${preparacao.id}`);
                    } else if (tipo === 'prato principal') {
                      (dayConfig.meals[mealType] as any).pratoPrincipal = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.pratoPrincipal = ${preparacao.id}`);
                    } else if (tipo === 'guarnição') {
                      (dayConfig.meals[mealType] as any).guarnicao = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.guarnicao = ${preparacao.id}`);
                    } else if (tipo === 'salada') {
                      (dayConfig.meals[mealType] as any).salada = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.salada = ${preparacao.id}`);
                    } else if (tipo === 'sobremesa') {
                      (dayConfig.meals[mealType] as any).sobremesa = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.sobremesa = ${preparacao.id}`);
                    } else if (tipo === 'líquido') {
                      (dayConfig.meals[mealType] as any).liquido = preparacao.id;
                      console.log(`🔍 [FASE 0]         Mapped to ${mealType}.liquido = ${preparacao.id}`);
                    }
                  }
                }
              });
            });
            } else {
              // This day exists but has no refeicoes - mark as holiday
              console.log(`🔍 [FASE 0]   - No refeicoes found, marking as holiday`);
              dayConfig.isHoliday = true;
            }
            loadedDaysConfig[index] = dayConfig;
            console.log(`🔍 [FASE 0]   - Day config for index ${index}:`, dayConfig);
          } else {
            // This day has no data - it's a holiday
            console.log(`🔍 [FASE 0]   - No cardapio do dia found, creating holiday config`);
            loadedDaysConfig[index] = {
              isHoliday: true,
              enabledMeals: {
                colacao: false,
                almoco: false,
                lanche: false,
                jantar: false,
              },
              meals: {
                colacao: { 
                  solido: '', 
                  liquido: '', 
                  frutas: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
                almoco: { 
                  acompanhamento1: '', 
                  acompanhamento2: '', 
                  complemento: '', 
                  pratoPrincipal: '', 
                  guarnicao: '', 
                  salada: '', 
                  sobremesa: '',
                  liquido: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
                lanche: { 
                  solido: '', 
                  liquido: '', 
                  frutas: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
                jantar: { 
                  acompanhamento1: '', 
                  acompanhamento2: '', 
                  complemento: '', 
                  pratoPrincipal: '', 
                  guarnicao: '', 
                  salada: '', 
                  sobremesa: '',
                  liquido: '',
                  comensaisPequenos: 0,
                  comensaisAdolescentes: 0,
                  comensaisAdultos: 0
                },
              },
            };
          }
        });
        
        console.log('🔍 [FASE 0] Step 7: Final loadedDaysConfig:', loadedDaysConfig);
        console.log('🔍 [FASE 0] Step 8: Calling setDaysConfig...');
        setDaysConfig(loadedDaysConfig);
        // Save initial state for change detection
        setInitialDaysConfig(JSON.parse(JSON.stringify(loadedDaysConfig)));
        setHasUnsavedChanges(false);
        console.log('🔍 [FASE 0] Step 9: setDaysConfig called successfully');
        console.log('🔍 [FASE 0] ======================================== END');
        showSuccess('Cardápio carregado!', 'Os dados do cardápio foram carregados para edição.');
      }
    } catch (error) {
      console.error('❌ [FASE 0] Error loading cardapio data:', error);
      showError('Erro ao carregar cardápio', 'Não foi possível carregar os dados do cardápio para edição.');
    } finally {
      setLoadingCardapioData(false);
    }
  };
  // Filter preparações by type
  const getPreparacoesByType = (tipo: string): Preparacao[] => {
    return preparacoes.filter(prep => prep.tipo === tipo);
  };

  // Generate array of dates between start and end date (inclusive)
  const generateDaysArray = (startDate: Date, endDate: Date): Date[] => {
    const days: Date[] = [];
    
    // Create new dates to avoid timezone issues
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const handleGenerateDays = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const days = generateDaysArray(dateRange.startDate, dateRange.endDate);
      setGeneratedDays(days);
      setActiveTab(0);
      
      // Initialize configuration for each day
      const initialConfig: Record<number, DayConfig> = {};
      days.forEach((_, index) => {
        initialConfig[index] = {
          isHoliday: false,
          enabledMeals: {
            colacao: true,
            almoco: true,
            lanche: true,
            jantar: true,
          },
          meals: {
            colacao: { 
              solido: '', 
              liquido: '', 
              frutas: '',
              comensaisPequenos: 0,
              comensaisAdolescentes: 0,
              comensaisAdultos: 0
            },
            almoco: { 
              acompanhamento1: '', 
              acompanhamento2: '', 
              complemento: '', 
              pratoPrincipal: '', 
              guarnicao: '', 
              salada: '', 
              sobremesa: '',
              liquido: '',
              comensaisPequenos: 0,
              comensaisAdolescentes: 0,
              comensaisAdultos: 0
            },
            lanche: { 
              solido: '', 
              liquido: '', 
              frutas: '',
              comensaisPequenos: 0,
              comensaisAdolescentes: 0,
              comensaisAdultos: 0
            },
            jantar: { 
              acompanhamento1: '', 
              acompanhamento2: '', 
              complemento: '', 
              pratoPrincipal: '', 
              guarnicao: '', 
              salada: '', 
              sobremesa: '',
              liquido: '',
              comensaisPequenos: 0,
              comensaisAdolescentes: 0,
              comensaisAdultos: 0
            },
          },
        };
      });
      setDaysConfig(initialConfig);
    }
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const resetModal = () => {
    setDateRange({ startDate: null, endDate: null });
    setGeneratedDays([]);
    setActiveTab(0);
    setDaysConfig({});
    setIsEditMode(false);
    setLoadingCardapioData(false);
    setSelectedExtraDate(null);
    setExtraDatesAdded([]);
    setInitialDaysConfig({});
    setHasUnsavedChanges(false);
    setShowUnsavedChangesModal(false);
  };

  const handleClose = () => {
    // Check for unsaved changes in edit mode
    if (isEditMode && hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
      return;
    }
    resetModal();
    onClose();
  };

  const handleConfirmClose = () => {
    setShowUnsavedChangesModal(false);
    resetModal();
    onClose();
  };

  const handleCancelClose = () => {
    setShowUnsavedChangesModal(false);
  };

  // Extra date management functions
  const handleExtraDateSelect = (date: Date | null) => {
    setSelectedExtraDate(date);
  };

  const handleAddExtraDate = () => {
    if (!selectedExtraDate) return;

    // Add the extra date to the list
    const newExtraDates = [...extraDatesAdded, selectedExtraDate];
    setExtraDatesAdded(newExtraDates);

    // Combine original days with extra dates and sort chronologically
    const allDates = [...generatedDays, ...newExtraDates].sort((a, b) => a.getTime() - b.getTime());
    setGeneratedDays(allDates);

    // Create default day config for the new date
    const newDayIndex = allDates.findIndex(date => date.getTime() === selectedExtraDate.getTime());
    const defaultDayConfig: DayConfig = {
      isHoliday: false,
      enabledMeals: {
        colacao: true,
        almoco: true,
        lanche: true,
        jantar: true,
      },
      meals: {
        colacao: { 
          solido: '', 
          liquido: '', 
          frutas: '',
          comensaisPequenos: 0,
          comensaisAdolescentes: 0,
          comensaisAdultos: 0
        },
        almoco: { 
          acompanhamento1: '', 
          acompanhamento2: '', 
          complemento: '', 
          pratoPrincipal: '', 
          guarnicao: '', 
          salada: '', 
          sobremesa: '',
          liquido: '',
          comensaisPequenos: 0,
          comensaisAdolescentes: 0,
          comensaisAdultos: 0
        },
        lanche: { 
          solido: '', 
          liquido: '', 
          frutas: '',
          comensaisPequenos: 0,
          comensaisAdolescentes: 0,
          comensaisAdultos: 0
        },
        jantar: { 
          acompanhamento1: '', 
          acompanhamento2: '', 
          complemento: '', 
          pratoPrincipal: '', 
          guarnicao: '', 
          salada: '', 
          sobremesa: '',
          liquido: '',
          comensaisPequenos: 0,
          comensaisAdolescentes: 0,
          comensaisAdultos: 0
        },
      },
    };

    // Update daysConfig with reindexed configurations
    const newDaysConfig: Record<number, DayConfig> = {};
    allDates.forEach((date, index) => {
      if (date.getTime() === selectedExtraDate.getTime()) {
        // This is the new extra date
        newDaysConfig[index] = defaultDayConfig;
      } else {
        // Find the original config for this date
        const originalIndex = generatedDays.findIndex(originalDate => originalDate.getTime() === date.getTime());
        if (originalIndex !== -1 && daysConfig[originalIndex]) {
          newDaysConfig[index] = daysConfig[originalIndex];
        }
      }
    });

    setDaysConfig(newDaysConfig);

    // Navigate to the new tab
    setActiveTab(newDayIndex);

    // Clear the selected extra date
    setSelectedExtraDate(null);
    
    // Show success feedback
    showSuccess('Data extra adicionada!', `${selectedExtraDate.toLocaleDateString('pt-BR')} foi adicionada ao cardápio.`);
  };

  // Update day configuration
  const updateDayConfig = (dayIndex: number, updates: Partial<DayConfig>) => {
    setDaysConfig(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        ...updates,
      },
    }));
  };

  // Toggle holiday status
  const toggleHoliday = (dayIndex: number) => {
    const currentConfig = daysConfig[dayIndex];
    if (currentConfig) {
      updateDayConfig(dayIndex, { isHoliday: !currentConfig.isHoliday });
    }
  };

  // Toggle meal enabled status
  const toggleMeal = (dayIndex: number, mealType: keyof DayConfig['enabledMeals']) => {
    const currentConfig = daysConfig[dayIndex];
    if (currentConfig) {
      updateDayConfig(dayIndex, {
        enabledMeals: {
          ...currentConfig.enabledMeals,
          [mealType]: !currentConfig.enabledMeals[mealType],
        },
      });
    }
  };
  // Update meal field
  const updateMealField = (
    dayIndex: number, 
    mealType: keyof MealData, 
    field: string, 
    value: string
  ) => {
    const currentConfig = daysConfig[dayIndex];
    if (currentConfig) {
      updateDayConfig(dayIndex, {
        meals: {
          ...currentConfig.meals,
          [mealType]: {
            ...currentConfig.meals[mealType],
            [field]: value,
          },
        },
      });
    }
  };

  // Get current day config
  const getCurrentDayConfig = (): DayConfig | null => {
    return daysConfig[activeTab] || null;
  };

  // Calculate calories for a meal
  const calculateMealCalories = async (preparacaoIds: string[]): Promise<{ pequenos: number; adolescentes: number; adultos: number }> => {
    let totalCalories = 0;

    // For each preparação in the meal
    for (const preparacaoId of preparacaoIds) {
      if (!preparacaoId) continue;

      try {
        // Fetch ingredientes for this preparação
        const { data: ingredientesData, error } = await DatabaseService.supabase
          .from('ingrediente_preparacao')
          .select(`
            quantidade_por_per_capita,
            ingredientes (
              kcal_por_100g_ou_100ml
            )
          `)
          .eq('preparacao_id', preparacaoId);

        if (error) {
          console.error('Error fetching ingredientes for preparação:', preparacaoId, error);
          continue;
        }

        if (!ingredientesData || ingredientesData.length === 0) {
          console.log('No ingredientes found for preparação:', preparacaoId);
          continue;
        }

        // Calculate calories for this preparação
        for (const item of ingredientesData) {
          const quantidadePerCapita = item.quantidade_por_per_capita;
          const kcalPor100g = (item.ingredientes as any)?.kcal_por_100g_ou_100ml;

          if (quantidadePerCapita && kcalPor100g) {
            // Formula: (quantidade_por_per_capita / 100) * kcal_por_100g_ou_100ml
            // Note: quantidade_por_per_capita is now in g/ml (not kg/L), so no need to multiply by 1000
            const caloriesFromIngredient = (quantidadePerCapita / 100) * kcalPor100g;
            totalCalories += caloriesFromIngredient;
          }
        }
      } catch (error) {
        console.error('Error calculating calories for preparação:', preparacaoId, error);
      }
    }

    // Apply multipliers for different age groups
    return {
      adultos: Math.round(totalCalories * 10) / 10, // 1.0x (base)
      adolescentes: Math.round(totalCalories * 0.8 * 10) / 10, // 0.8x
      pequenos: Math.round(totalCalories * 0.6 * 10) / 10, // 0.6x
    };
  };

  // Handle cardapio save
  const handleSaveCardapio = async () => {
    if (!profile?.id) {
      showError('Erro: Usuário não autenticado');
      return;
    }

    if (generatedDays.length === 0) {
      showError('Erro: Nenhum dia foi gerado para o cardápio');
      return;
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      showError('Erro: Data inicial e final são obrigatórias');
      return;
    }

    // Verificar se há pelo menos um dia não feriado
    const nonHolidayDays = generatedDays.filter((_, index) => !daysConfig[index]?.isHoliday);
    if (nonHolidayDays.length === 0) {
      showError('Erro: Pelo menos um dia deve não ser feriado/recesso');
      return;
    }

    // Verificar se há pelo menos uma refeição habilitada
    let hasEnabledMeal = false;
    for (let i = 0; i < generatedDays.length; i++) {
      const dayConfig = daysConfig[i];
      if (!dayConfig?.isHoliday) {
        const enabledMeals = Object.values(dayConfig?.enabledMeals || {});
        if (enabledMeals.some(enabled => enabled)) {
          hasEnabledMeal = true;
          break;
        }
      }
    }

    if (!hasEnabledMeal) {
      showError('Erro: Pelo menos uma refeição deve estar habilitada');
      return;
    }
    setIsLoading(true);
    console.log('[CardapioModal] Loading started, isLoading:', true);
    try {
      console.log('Saving cardapio with data:', { dateRange, generatedDays, daysConfig, isEditMode });
      
      let result;
      
      if (isEditMode && cardapioToEdit) {
        // Edit mode - use updateCardapioCompleto
        console.log('[CardapioModal] Using edit mode - updating cardapio:', cardapioToEdit.id);
        result = await DatabaseService.updateCardapioCompleto(
          cardapioToEdit.id,
          { 
            dateRange: { 
              startDate: dateRange.startDate!, 
              endDate: dateRange.endDate! 
            }, 
            generatedDays, 
            daysConfig, 
            userId: profile.id,
            calculatedCalories
          }
        );
      } else {
        // Create mode - use createCardapioCompleto (existing)
        console.log('[CardapioModal] Using create mode - creating new cardapio');
        result = await DatabaseService.createCardapioCompleto({
          dateRange: { 
            startDate: dateRange.startDate!, 
            endDate: dateRange.endDate! 
          },
          generatedDays,
          daysConfig,
          userId: profile.id,
          calculatedCalories
        });
      }

      if (result.success) {
        const successMessage = isEditMode ? 'Cardápio atualizado com sucesso!' : 'Cardápio criado com sucesso!';
        showSuccess(successMessage);
        // Reset unsaved changes state after successful save
        setHasUnsavedChanges(false);
        setInitialDaysConfig(JSON.parse(JSON.stringify(daysConfig)));
        onSave({ 
          dateRange, 
          generatedDays, 
          daysConfig,
          cardapioSemanalId: (result as any).cardapioSemanalId || cardapioToEdit?.id
        });
        handleClose();
      } else {
        const errorMessage = isEditMode ? 'Erro ao atualizar cardápio' : 'Erro ao criar cardápio';
        showError(`${errorMessage}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving cardapio:', error);
      const errorMessage = isEditMode ? 'Erro inesperado ao atualizar cardápio' : 'Erro inesperado ao salvar cardápio';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('[CardapioModal] Loading finished, isLoading:', false);
    }
  };
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i data-lucide="calendar-days" className="w-5 h-5 text-green-600"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditMode ? 'Editar Cardápio' : 'Criar Cardápio'}
              </h2>
              <p className="text-sm text-slate-500">
                {isEditMode ? 'Modifique o período e organize as refeições por dia' : 'Configure o período e organize as refeições por dia'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <i data-lucide="x" className="w-5 h-5 text-slate-400"></i>
          </button>
        </div>
        {/* Modal Content */}
        <div className="p-6">
          {/* Loading indicator for edit mode */}
          {loadingCardapioData && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Carregando dados do cardápio...</p>
                  <p className="text-xs text-blue-600">Aguarde enquanto carregamos as informações para edição</p>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Selection */}
          <div className="mb-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Selecione o período
              </h3>
              
              {/* Date Range Inputs with Generate Button */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Data inicial <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Create date without timezone issues
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const newStartDate = new Date(year, month - 1, day);
                          setDateRange(prev => ({ ...prev, startDate: newStartDate }));
                        } else {
                          setDateRange(prev => ({ ...prev, startDate: null }));
                        }
                      }}
                      disabled={isEditMode || loadingCardapioData}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Data final <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Create date without timezone issues
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const newEndDate = new Date(year, month - 1, day);
                          setDateRange(prev => ({ ...prev, endDate: newEndDate }));
                        } else {
                          setDateRange(prev => ({ ...prev, endDate: null }));
                        }
                      }}
                      min={dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : ''}
                      disabled={isEditMode || loadingCardapioData}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                {/* Generate Days Button - Only show in create mode */}
                {!isEditMode && (
                  <button
                    onClick={handleGenerateDays}
                    disabled={!dateRange.startDate || !dateRange.endDate}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:bg-slate-300 font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <i data-lucide="calendar-days" className="w-4 h-4"></i>
                    Gerar dias do cardápio
                  </button>
                )}
              </div>

              {/* Selected Period Display */}
              {dateRange.startDate && dateRange.endDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <i data-lucide="calendar-check" className="w-4 h-4"></i>
                    <span className="font-medium">
                      Período selecionado: {formatDate(dateRange.startDate)} até {formatDate(dateRange.endDate)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-blue-600">
                    Total de {Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                  </div>
                </div>
              )}

              {/* Extra Date Input - Only show in edit mode */}
              {isEditMode && (
                <ExtraDateInput
                  existingDates={generatedDays}
                  onDateSelect={handleExtraDateSelect}
                  onAddDate={handleAddExtraDate}
                  selectedDate={selectedExtraDate}
                  disabled={loadingCardapioData}
                />
              )}
            </div>
          </div>

          {/* Generated Days Tabs */}
          {generatedDays.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Dias do Cardápio
              </h3>
              
              {/* Tabs Navigation */}
              <div className="border-b border-slate-200">
                <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                  <div className="flex space-x-1 min-w-max">
                    {generatedDays.map((day, index) => {
                      const isHoliday = daysConfig[index]?.isHoliday || false;
                      const isExtraDate = extraDatesAdded.some(extraDate => 
                        extraDate.toDateString() === day.toDateString()
                      );
                      return (
                        <button
                          key={index}
                          onClick={() => setActiveTab(index)}
                          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap relative ${
                            activeTab === index
                              ? isHoliday
                                ? 'text-red-700 border-red-600 bg-red-50'
                                : 'text-blue-600 border-blue-600 bg-blue-50'
                              : isHoliday
                              ? 'text-red-600 border-transparent hover:text-red-700 hover:border-red-300 bg-red-50/50'
                              : 'text-slate-600 border-transparent hover:text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {/* Extra date indicator */}
                          {isExtraDate && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white" title="Data extra adicionada"></div>
                          )}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs capitalize">
                              {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                            <span className="text-xs">
                              {formatDateShort(day)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Tab Content */}
              <div className="min-h-[300px] bg-slate-50 rounded-lg border border-slate-200">
                {generatedDays[activeTab] && getCurrentDayConfig() && (
                  <div className="p-6">
                    {/* Day Header */}
                    <div className="mb-6 flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-slate-800 capitalize">
                        {formatDate(generatedDays[activeTab])}
                      </h4>
                      {/* Delete Day Checkbox - Only visible in EDIT mode */}
                      {isEditMode && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={getCurrentDayConfig()?.isHoliday || false}
                            onChange={() => toggleHoliday(activeTab)}
                            className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-red-600 group-hover:text-red-700">
                            Excluir cardápio deste dia
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Holiday/Recess Checkbox - Only visible in CREATE mode */}
                    {!isEditMode && (
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={getCurrentDayConfig()?.isHoliday || false}
                            onChange={() => toggleHoliday(activeTab)}
                            className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-red-600 group-hover:text-red-700">
                            Feriado/Recesso
                          </span>
                        </label>
                        {getCurrentDayConfig()?.isHoliday && (
                          <p className="mt-2 text-xs text-slate-500 ml-6">
                            Os campos de refeições estão desabilitados para este dia
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Message when day is marked as deleted (Edit mode only) */}
                    {isEditMode && getCurrentDayConfig()?.isHoliday && (
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <p className="text-xs text-slate-500">
                          Os campos de refeições estão desabilitados para este dia
                        </p>
                      </div>
                    )}

                    {/* Meal Type Checkboxes */}
                    <div className="mb-6 pb-4 border-b border-slate-200">
                      <h5 className="text-sm font-semibold text-slate-700 mb-3">
                        Refeições do dia
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={getCurrentDayConfig()?.enabledMeals.colacao || false}
                            onChange={() => toggleMeal(activeTab, 'colacao')}
                            disabled={getCurrentDayConfig()?.isHoliday}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            Colação
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={getCurrentDayConfig()?.enabledMeals.almoco || false}
                            onChange={() => toggleMeal(activeTab, 'almoco')}
                            disabled={getCurrentDayConfig()?.isHoliday}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            Almoço
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={getCurrentDayConfig()?.enabledMeals.lanche || false}
                            onChange={() => toggleMeal(activeTab, 'lanche')}
                            disabled={getCurrentDayConfig()?.isHoliday}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            Lanche
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={getCurrentDayConfig()?.enabledMeals.jantar || false}
                            onChange={() => toggleMeal(activeTab, 'jantar')}
                            disabled={getCurrentDayConfig()?.isHoliday}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            Jantar
                          </span>
                        </label>
                      </div>
                    </div>
                    {/* Simplified Meals Forms - Basic structure for now */}
                    <div className="space-y-6">
                      {/* Colação */}
                      {getCurrentDayConfig()?.enabledMeals.colacao && (
                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                          <h5 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
                            <i data-lucide="coffee" className="w-7 h-7" style={{ color: '#588157' }}></i>
                            Colação
                          </h5>
                          {/* Separator line after title */}
                          <div className="border-t border-slate-200 mb-4"></div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Sólido</label>
                              <select
                                value={getCurrentDayConfig()?.meals.colacao.solido || ''}
                                onChange={(e) => updateMealField(activeTab, 'colacao', 'solido', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.colacao.solido || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('sólido').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Líquido</label>
                              <select
                                value={getCurrentDayConfig()?.meals.colacao.liquido || ''}
                                onChange={(e) => updateMealField(activeTab, 'colacao', 'liquido', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.colacao.liquido || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('líquido').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Frutas</label>
                              <select
                                value={getCurrentDayConfig()?.meals.colacao.frutas || ''}
                                onChange={(e) => updateMealField(activeTab, 'colacao', 'frutas', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.colacao.frutas || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('frutas').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* Separator line before comensais */}
                          <div className="border-t border-slate-200 mt-9 mb-4"></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={criancasIcon} alt="Crianças" className="w-6 h-6" />
                                Comensais pequenos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.colacao.comensaisPequenos || 0}
                                onChange={(e) => updateMealField(activeTab, 'colacao', 'comensaisPequenos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adolescentesIcon} alt="Adolescentes" className="w-6 h-6" />
                                Comensais adolescentes
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.colacao.comensaisAdolescentes || 0}
                                onChange={(e) => updateMealField(activeTab, 'colacao', 'comensaisAdolescentes', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adultosIcon} alt="Adultos" className="w-6 h-6" />
                                Comensais adultos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.colacao.comensaisAdultos || 0}
                                onChange={(e) => updateMealField(activeTab, 'colacao', 'comensaisAdultos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                          {/* Separator line before caloric information */}
                          <div className="border-t border-slate-200 mt-6 mb-4"></div>
                          {/* Caloric Information Section */}
                          <div>
                            <h6 className="text-sm font-semibold text-slate-700 mb-3">Informações calóricas</h6>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos pequenos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.colacao?.pequenos 
                                    ? `${calculatedCalories[activeTab].colacao.pequenos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adolescentes
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.colacao?.adolescentes 
                                    ? `${calculatedCalories[activeTab].colacao.adolescentes} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adultos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.colacao?.adultos 
                                    ? `${calculatedCalories[activeTab].colacao.adultos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Almoço */}
                      {getCurrentDayConfig()?.enabledMeals.almoco && (
                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                          <h5 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
                            <i data-lucide="utensils" className="w-7 h-7 text-orange-600"></i>
                            Almoço
                          </h5>
                          {/* Separator line after title */}
                          <div className="border-t border-slate-200 mb-4"></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Acompanhamento 1</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.acompanhamento1 || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'acompanhamento1', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.acompanhamento1 || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('acompanhamento').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Acompanhamento 2</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.acompanhamento2 || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'acompanhamento2', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.acompanhamento2 || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('acompanhamento').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Prato principal</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.pratoPrincipal || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'pratoPrincipal', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.pratoPrincipal || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('prato principal').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Complemento</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.complemento || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'complemento', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.complemento || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('complemento').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Guarnição</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.guarnicao || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'guarnicao', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.guarnicao || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('guarnição').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Salada</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.salada || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'salada', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.salada || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('salada').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Sobremesa</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.sobremesa || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'sobremesa', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.sobremesa || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('sobremesa').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Líquido</label>
                              <select
                                value={getCurrentDayConfig()?.meals.almoco.liquido || ''}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'liquido', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.almoco.liquido || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('líquido').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* Separator line before comensais */}
                          <div className="border-t border-slate-200 mt-4 mb-4"></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={criancasIcon} alt="Crianças" className="w-6 h-6" />
                                Comensais pequenos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.almoco.comensaisPequenos || 0}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'comensaisPequenos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adolescentesIcon} alt="Adolescentes" className="w-6 h-6" />
                                Comensais adolescentes
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.almoco.comensaisAdolescentes || 0}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'comensaisAdolescentes', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adultosIcon} alt="Adultos" className="w-6 h-6" />
                                Comensais adultos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.almoco.comensaisAdultos || 0}
                                onChange={(e) => updateMealField(activeTab, 'almoco', 'comensaisAdultos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                          {/* Separator line before caloric information */}
                          <div className="border-t border-slate-200 mt-6 mb-4"></div>
                          {/* Caloric Information Section */}
                          <div>
                            <h6 className="text-sm font-semibold text-slate-700 mb-3">Informações calóricas</h6>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos pequenos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.almoco?.pequenos 
                                    ? `${calculatedCalories[activeTab].almoco.pequenos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adolescentes
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.almoco?.adolescentes 
                                    ? `${calculatedCalories[activeTab].almoco.adolescentes} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adultos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.almoco?.adultos 
                                    ? `${calculatedCalories[activeTab].almoco.adultos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Lanche - Similar to Colação */}
                      {getCurrentDayConfig()?.enabledMeals.lanche && (
                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                          <h5 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
                            <i data-lucide="cookie" className="w-7 h-7 text-pink-600"></i>
                            Lanche
                          </h5>
                          {/* Separator line after title */}
                          <div className="border-t border-slate-200 mb-4"></div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Sólido</label>
                              <select
                                value={getCurrentDayConfig()?.meals.lanche.solido || ''}
                                onChange={(e) => updateMealField(activeTab, 'lanche', 'solido', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.lanche.solido || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('sólido').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Líquido</label>
                              <select
                                value={getCurrentDayConfig()?.meals.lanche.liquido || ''}
                                onChange={(e) => updateMealField(activeTab, 'lanche', 'liquido', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.lanche.liquido || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('líquido').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Frutas</label>
                              <select
                                value={getCurrentDayConfig()?.meals.lanche.frutas || ''}
                                onChange={(e) => updateMealField(activeTab, 'lanche', 'frutas', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.lanche.frutas || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('frutas').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* Separator line before comensais */}
                          <div className="border-t border-slate-200 mt-9 mb-4"></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={criancasIcon} alt="Crianças" className="w-6 h-6" />
                                Comensais pequenos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.lanche.comensaisPequenos || 0}
                                onChange={(e) => updateMealField(activeTab, 'lanche', 'comensaisPequenos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adolescentesIcon} alt="Adolescentes" className="w-6 h-6" />
                                Comensais adolescentes
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.lanche.comensaisAdolescentes || 0}
                                onChange={(e) => updateMealField(activeTab, 'lanche', 'comensaisAdolescentes', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adultosIcon} alt="Adultos" className="w-6 h-6" />
                                Comensais adultos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.lanche.comensaisAdultos || 0}
                                onChange={(e) => updateMealField(activeTab, 'lanche', 'comensaisAdultos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                          {/* Separator line before caloric information */}
                          <div className="border-t border-slate-200 mt-6 mb-4"></div>
                          {/* Caloric Information Section */}
                          <div>
                            <h6 className="text-sm font-semibold text-slate-700 mb-3">Informações calóricas</h6>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos pequenos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.lanche?.pequenos 
                                    ? `${calculatedCalories[activeTab].lanche.pequenos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adolescentes
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.lanche?.adolescentes 
                                    ? `${calculatedCalories[activeTab].lanche.adolescentes} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adultos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.lanche?.adultos 
                                    ? `${calculatedCalories[activeTab].lanche.adultos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Jantar - Similar to Almoço */}
                      {getCurrentDayConfig()?.enabledMeals.jantar && (
                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                          <h5 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-4">
                            <i data-lucide="moon" className="w-7 h-7 text-indigo-600"></i>
                            Jantar
                          </h5>
                          {/* Separator line after title */}
                          <div className="border-t border-slate-200 mb-4"></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Acompanhamento 1</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.acompanhamento1 || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'acompanhamento1', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.acompanhamento1 || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('acompanhamento').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Acompanhamento 2</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.acompanhamento2 || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'acompanhamento2', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.acompanhamento2 || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('acompanhamento').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Prato principal</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.pratoPrincipal || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'pratoPrincipal', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.pratoPrincipal || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('prato principal').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Complemento</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.complemento || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'complemento', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.complemento || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('complemento').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Guarnição</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.guarnicao || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'guarnicao', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.guarnicao || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('guarnição').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Salada</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.salada || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'salada', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.salada || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('salada').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Sobremesa</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.sobremesa || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'sobremesa', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.sobremesa || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('sobremesa').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Líquido</label>
                              <select
                                value={getCurrentDayConfig()?.meals.jantar.liquido || ''}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'liquido', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday || loadingPreparacoes}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed ${(getCurrentDayConfig()?.meals.jantar.liquido || '') === '' ? 'text-slate-400' : 'text-slate-900'}`}
                              >
                                <option value="" className="text-slate-400">{loadingPreparacoes ? 'Carregando...' : 'Selecione uma opção'}</option>
                                {getPreparacoesByType('líquido').map((preparacao) => (
                                  <option key={preparacao.id} value={preparacao.id} className="text-slate-900">{preparacao.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* Separator line before comensais */}
                          <div className="border-t border-slate-200 mt-4 mb-4"></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={criancasIcon} alt="Crianças" className="w-6 h-6" />
                                Comensais pequenos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.jantar.comensaisPequenos || 0}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'comensaisPequenos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adolescentesIcon} alt="Adolescentes" className="w-6 h-6" />
                                Comensais adolescentes
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.jantar.comensaisAdolescentes || 0}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'comensaisAdolescentes', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <img src={adultosIcon} alt="Adultos" className="w-6 h-6" />
                                Comensais adultos
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getCurrentDayConfig()?.meals.jantar.comensaisAdultos || 0}
                                onChange={(e) => updateMealField(activeTab, 'jantar', 'comensaisAdultos', e.target.value)}
                                disabled={getCurrentDayConfig()?.isHoliday}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                          {/* Separator line before caloric information */}
                          <div className="border-t border-slate-200 mt-6 mb-4"></div>
                          {/* Caloric Information Section */}
                          <div>
                            <h6 className="text-sm font-semibold text-slate-700 mb-3">Informações calóricas</h6>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos pequenos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.jantar?.pequenos 
                                    ? `${calculatedCalories[activeTab].jantar.pequenos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adolescentes
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.jantar?.adolescentes 
                                    ? `${calculatedCalories[activeTab].jantar.adolescentes} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Prato dos adultos
                                </label>
                                <p className="text-sm text-slate-400">
                                  {calculatedCalories[activeTab]?.jantar?.adultos 
                                    ? `${calculatedCalories[activeTab].jantar.adultos} kcal` 
                                    : '-- kcal'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {generatedDays.length > 0 && (
              <span>
                {generatedDays.filter((_, index) => !daysConfig[index]?.isHoliday).length} dias úteis de {generatedDays.length} dias totais
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveCardapio}
              disabled={generatedDays.length === 0 || isLoading}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 ${
                generatedDays.length === 0 || isLoading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'Salvando alterações...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Salvar Alterações' : 'Salvar Cardápio'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Loading Modal */}
      {isLoading && (
        <LoadingModal
          isOpen={isLoading}
          message={isEditMode ? 'Salvando alterações do cardápio...' : 'Salvando cardápio...'}
        />
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedChangesModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelClose();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <i data-lucide="alert-triangle" className="w-5 h-5 text-red-600"></i>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Alterações não salvas</h2>
                  <p className="text-sm text-slate-500">Você tem alterações pendentes</p>
                </div>
              </div>
              <button
                onClick={handleCancelClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <i data-lucide="x" className="w-5 h-5 text-slate-400"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-3">
                  Você fez alterações no cardápio que ainda não foram salvas. Se fechar agora, essas alterações serão perdidas.
                </p>
                
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-900">Deseja realmente cancelar as alterações?</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Descartar alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardapioModal;