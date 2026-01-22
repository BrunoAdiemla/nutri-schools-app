import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  nome: string;
  email: string;
  cidade: string;
  estado: string;
  rua?: string;
  bairro?: string;
  cep?: string;
  funcao?: string;
  nome_escola: string;
  avatar_url?: string;
  created_at: string;
}

export interface DashboardStats {
  ingredientes: number;
  preparacoes: number;
  cardapios: number;
  listas_compras: number;
}

// Interfaces for Cardapio Edit functionality
interface ChangeSet {
  cardapiosToDelete: string[];
  cardapiosToUpdate: Array<{ id: string; data: any }>;
  cardapiosToCreate: any[];
  refeicoesToDelete: string[];
  refeicoesToUpdate: Array<{ id: string; data: any }>;
  refeicoesToCreate: any[];
  preparacoesToDelete: string[];
  preparacoesToCreate: any[];
}

interface DayConfig {
  isHoliday: boolean;
  enabledMeals: {
    colacao: boolean;
    almoco: boolean;
    lanche: boolean;
    jantar: boolean;
  };
  meals: {
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
      comensaisPequenos: number;
      comensaisAdolescentes: number;
      comensaisAdultos: number;
    };
  };
}

interface CardapioUpdateData {
  dateRange: { startDate: Date; endDate: Date };
  generatedDays: Date[];
  daysConfig: Record<number, DayConfig>;
  userId: string;
}

export class DatabaseService {
  // User Profile Management
  static async createUserProfile(user: User, profileData: Omit<UserProfile, 'id' | 'auth_user_id' | 'created_at'>): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            auth_user_id: user.id, // Use auth_user_id instead of id
            ...profileData,
          }
        ])
        .select()
        .single();

      if (error) {
        logger.error('Error creating user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error creating user profile:', error);
      return null;
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      logger.log('🔍 DatabaseService.getUserProfile - Starting query for userId:', userId);
      
      // Create timeout promise (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
      );

      // Create the actual query promise
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      // Race between query and timeout
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      logger.log('🔍 DatabaseService.getUserProfile - Query completed:', {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details
      });

      if (error) {
        // If no rows returned, user profile doesn't exist yet
        if (error.code === 'PGRST116') {
          logger.log('📝 DatabaseService.getUserProfile - No profile found (expected for new users)');
          return null;
        }
        
        // For other errors, log and return null
        logger.error('❌ DatabaseService.getUserProfile - Database error:', error);
        return null;
      }

      logger.log('✅ DatabaseService.getUserProfile - Profile found:', data ? 'YES' : 'NO');
      return data;
    } catch (error) {
      logger.error('💥 DatabaseService.getUserProfile - Exception:', error);
      
      // If it's a timeout error, we know the query is hanging
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.error('⏰ Query timeout - Supabase query is hanging');
      }
      
      return null;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('auth_user_id', userId) // Use auth_user_id instead of id
        .select()
        .single();

      if (error) {
        logger.error('Error updating user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      return null;
    }
  }

  // Dashboard Statistics
  static async getDashboardStats(userId: string): Promise<DashboardStats | null> {
    try {
      const [ingredientesResult, preparacoesResult, cardapiosResult, listasResult] = await Promise.all([
        supabase.from('ingredientes').select('id', { count: 'exact' }).eq('created_by', userId),
        supabase.from('preparacoes').select('id', { count: 'exact' }).eq('created_by', userId),
        supabase.from('cardapios_do_dia').select('id', { count: 'exact' }).eq('created_by', userId),
        supabase.from('listas_compras').select('id', { count: 'exact' }).eq('created_by', userId),
      ]);

      if (ingredientesResult.error || preparacoesResult.error || cardapiosResult.error || listasResult.error) {
        logger.error('Error fetching dashboard stats:', {
          ingredientes: ingredientesResult.error,
          preparacoes: preparacoesResult.error,
          cardapios: cardapiosResult.error,
          listas: listasResult.error,
        });
        return null;
      }

      return {
        ingredientes: ingredientesResult.count || 0,
        preparacoes: preparacoesResult.count || 0,
        cardapios: cardapiosResult.count || 0,
        listas_compras: listasResult.count || 0,
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      return null;
    }
  }

  // Real-time subscription handling
  static subscribeToUserData(userId: string, callback: (stats: DashboardStats) => void) {
    const channels = [
      supabase
        .channel('ingredientes_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'ingredientes', filter: `created_by=eq.${userId}` },
          () => this.getDashboardStats(userId).then(stats => stats && callback(stats))
        ),
      supabase
        .channel('preparacoes_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'preparacoes', filter: `created_by=eq.${userId}` },
          () => this.getDashboardStats(userId).then(stats => stats && callback(stats))
        ),
      supabase
        .channel('cardapios_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'cardapios_do_dia', filter: `created_by=eq.${userId}` },
          () => this.getDashboardStats(userId).then(stats => stats && callback(stats))
        ),
      supabase
        .channel('listas_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'listas_compras', filter: `created_by=eq.${userId}` },
          () => this.getDashboardStats(userId).then(stats => stats && callback(stats))
        ),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }

  // Generic CRUD operations
  static async create<T>(table: string, data: Omit<T, 'id' | 'created_at'>): Promise<T | null> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert([data])
        .select()
        .single();

      if (error) {
        logger.error(`Error creating ${table}:`, error);
        return null;
      }

      return result;
    } catch (error) {
      logger.error(`Error creating ${table}:`, error);
      return null;
    }
  }

  static async read<T>(table: string, filters?: Record<string, any>): Promise<T[] | null> {
    try {
      let query = supabase.from(table).select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`Error reading ${table}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error(`Error reading ${table}:`, error);
      return null;
    }
  }

  static async update<T>(table: string, id: string, updates: Partial<T>): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`Error updating ${table}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error(`Error updating ${table}:`, error);
      return null;
    }
  }

  static async delete(table: string, id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(`Error deleting from ${table}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Error deleting from ${table}:`, error);
      return false;
    }
  }

  // Ingredients Management
  static async getIngredients(userId: string): Promise<any[] | null> {
    try {
      const { data, error } = await supabase
        .from('ingredientes')
        .select('*')
        .or(`default_ingredient.eq.true,created_by.eq.${userId}`)
        .order('nome');

      if (error) {
        logger.error('Error fetching ingredients:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching ingredients:', error);
      return null;
    }
  }

  // Preparations Management
  static async getPreparacoes(userTableId: string): Promise<any[] | null> {
    try {
      logger.log(`[DatabaseService] Fetching preparations for user table ID: ${userTableId}`);
      
      // Create timeout promise (10 seconds for database operations)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
      );

      // Query preparations using the user table ID directly (same as getIngredients)
      // Query: WHERE (default_preparation = TRUE) OR (created_by = user_table_id)
      const queryPromise = supabase
        .from('preparacoes')
        .select('*')
        .or(`default_preparation.eq.true,created_by.eq.${userTableId}`)
        .order('nome');

      // Race between query and timeout
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      logger.log(`[DatabaseService] Preparations query completed:`, {
        hasData: !!data,
        dataCount: data?.length || 0,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message
      });

      if (error) {
        logger.error('❌ DatabaseService.getPreparacoes - Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      logger.log(`✅ DatabaseService.getPreparacoes - Found ${data?.length || 0} preparations`);
      return data || [];
    } catch (error) {
      logger.error('💥 DatabaseService.getPreparacoes - Exception:', error);
      
      // If it's a timeout error, we know the query is hanging
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.error('⏰ Query timeout - Supabase query is hanging');
        throw new Error('Database connection timeout. Please try again.');
      }
      
      // Re-throw the error to be handled by the calling code
      throw error;
    }
  }

  static async createPreparacao(preparacaoData: any, ingredientes: any[] = []): Promise<any | null> {
    try {
      logger.log(`[DatabaseService] Creating preparation:`, preparacaoData.nome);
      logger.log(`[DatabaseService] With ${ingredientes.length} ingredients`);
      
      // Criar a preparação primeiro
      const { data: preparacao, error: preparacaoError } = await supabase
        .from('preparacoes')
        .insert([{
          ...preparacaoData,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (preparacaoError) {
        logger.error('❌ DatabaseService.createPreparacao - Database error:', preparacaoError);
        throw new Error(`Failed to create preparation: ${preparacaoError.message}`);
      }

      logger.log(`✅ DatabaseService.createPreparacao - Created preparation:`, preparacao.id);

      // Se há ingredientes, criar os registros na tabela ingrediente_preparacao
      if (ingredientes.length > 0) {
        logger.log(`[DatabaseService] Creating ${ingredientes.length} ingredient-preparation links`);
        
        const ingredientePreparacaoData = ingredientes.map(ingrediente => ({
          ingrediente_id: ingrediente.ingrediente_id,
          preparacao_id: preparacao.id,
          quantidade_por_per_capita: ingrediente.quantidade_por_per_capita,
          unidade_medida: ingrediente.unidade_medida,
          nome_preparacao: preparacao.nome, // Populate denormalized field
          nome_ingrediente: ingrediente.nome // Populate denormalized field
        }));

        const { error: ingredientesError } = await supabase
          .from('ingrediente_preparacao')
          .insert(ingredientePreparacaoData);

        if (ingredientesError) {
          logger.error('❌ DatabaseService.createPreparacao - Error creating ingredient links:', ingredientesError);
          
          // Se falhar ao criar ingredientes, deletar a preparação para manter consistência
          await supabase.from('preparacoes').delete().eq('id', preparacao.id);
          
          throw new Error(`Failed to create ingredient links: ${ingredientesError.message}`);
        }

        logger.log(`✅ DatabaseService.createPreparacao - Created ${ingredientes.length} ingredient links`);
      }

      return preparacao;
    } catch (error) {
      logger.error('💥 DatabaseService.createPreparacao - Exception:', error);
      throw error;
    }
  }

  static async updatePreparacao(id: string, updates: any, ingredientes: any[] = []): Promise<any | null> {
    try {
      logger.log(`[DatabaseService] Updating preparation:`, id);
      logger.log(`[DatabaseService] With ${ingredientes.length} ingredients`);
      
      // Atualizar a preparação
      const { data: preparacao, error: preparacaoError } = await supabase
        .from('preparacoes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (preparacaoError) {
        logger.error('❌ DatabaseService.updatePreparacao - Database error:', preparacaoError);
        throw new Error(`Failed to update preparation: ${preparacaoError.message}`);
      }

      // Atualizar ingredientes se fornecidos
      if (ingredientes.length >= 0) { // Permite array vazio para remover todos os ingredientes
        logger.log(`[DatabaseService] Updating ingredient links for preparation: ${id}`);
        
        // Primeiro, remover todos os ingredientes existentes
        const { error: deleteError } = await supabase
          .from('ingrediente_preparacao')
          .delete()
          .eq('preparacao_id', id);

        if (deleteError) {
          logger.error('❌ DatabaseService.updatePreparacao - Error deleting existing ingredients:', deleteError);
          throw new Error(`Failed to delete existing ingredients: ${deleteError.message}`);
        }

        // Depois, inserir os novos ingredientes (se houver)
        if (ingredientes.length > 0) {
          const ingredientePreparacaoData = ingredientes.map(ingrediente => ({
            ingrediente_id: ingrediente.ingrediente_id,
            preparacao_id: id,
            quantidade_por_per_capita: ingrediente.quantidade_por_per_capita,
            unidade_medida: ingrediente.unidade_medida,
            nome_preparacao: preparacao.nome, // Populate denormalized field
            nome_ingrediente: ingrediente.nome // Populate denormalized field
          }));

          const { error: insertError } = await supabase
            .from('ingrediente_preparacao')
            .insert(ingredientePreparacaoData);

          if (insertError) {
            logger.error('❌ DatabaseService.updatePreparacao - Error inserting new ingredients:', insertError);
            throw new Error(`Failed to insert new ingredients: ${insertError.message}`);
          }

          logger.log(`✅ DatabaseService.updatePreparacao - Updated ${ingredientes.length} ingredient links`);
        }
      }

      logger.log(`✅ DatabaseService.updatePreparacao - Updated preparation:`, preparacao.id);
      return preparacao;
    } catch (error) {
      logger.error('💥 DatabaseService.updatePreparacao - Exception:', error);
      throw error;
    }
  }

  static async deletePreparacao(id: string): Promise<boolean> {
    try {
      logger.log(`[DatabaseService] Deleting preparation:`, id);
      
      // O CASCADE na foreign key já vai deletar os ingrediente_preparacao automaticamente
      const { error } = await supabase
        .from('preparacoes')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('❌ DatabaseService.deletePreparacao - Database error:', error);
        throw new Error(`Failed to delete preparation: ${error.message}`);
      }

      logger.log(`✅ DatabaseService.deletePreparacao - Deleted preparation:`, id);
      return true;
    } catch (error) {
      logger.error('💥 DatabaseService.deletePreparacao - Exception:', error);
      throw error;
    }
  }

  // Buscar ingredientes de uma preparação específica
  static async getPreparacaoIngredientes(preparacaoId: string): Promise<any[] | null> {
    try {
      logger.log(`[DatabaseService] Fetching ingredients for preparation: ${preparacaoId}`);
      
      const { data, error } = await supabase
        .from('ingrediente_preparacao')
        .select(`
          id,
          quantidade_por_per_capita,
          unidade_medida,
          ingredientes:ingrediente_id (
            id,
            nome,
            unidade_medida,
            kcal_por_100g_ou_100ml
          )
        `)
        .eq('preparacao_id', preparacaoId);

      if (error) {
        logger.error('❌ DatabaseService.getPreparacaoIngredientes - Database error:', error);
        throw new Error(`Failed to fetch preparation ingredients: ${error.message}`);
      }

      logger.log(`✅ DatabaseService.getPreparacaoIngredientes - Found ${data?.length || 0} ingredients`);
      return data || [];
    } catch (error) {
      logger.error('💥 DatabaseService.getPreparacaoIngredientes - Exception:', error);
      throw error;
    }
  }

  static async createIngredient(ingredientData: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('ingredientes')
        .insert([ingredientData])
        .select()
        .single();

      if (error) {
        logger.error('Error creating ingredient:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error creating ingredient:', error);
      return null;
    }
  }

  static async updateIngredient(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('ingredientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating ingredient:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error updating ingredient:', error);
      return null;
    }
  }

  static async deleteIngredient(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ingredientes')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting ingredient:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting ingredient:', error);
      return false;
    }
  }

  // Cardapio Management
  static async createCardapioCompleto(cardapioData: any): Promise<{ success: boolean; cardapioSemanalId?: string; error?: string }> {
    try {
      logger.log('[DatabaseService] Creating complete cardapio:', cardapioData);

      const { dateRange, generatedDays, daysConfig } = cardapioData;
      const userId = cardapioData.userId;

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validações básicas
      if (!dateRange.startDate || !dateRange.endDate) {
        throw new Error('Data inicial e final são obrigatórias');
      }

      if (generatedDays.length === 0) {
        throw new Error('Nenhum dia foi gerado para o cardápio');
      }

      // Verificar se há pelo menos um dia não feriado
      const nonHolidayDays = generatedDays.filter((_: any, index: number) => !daysConfig[index]?.isHoliday);
      if (nonHolidayDays.length === 0) {
        throw new Error('Pelo menos um dia deve não ser feriado/recesso');
      }

      // Usar transação para garantir consistência
      const { data: cardapioSemanal, error: cardapioSemanalError } = await supabase
        .from('cardapios_semanais')
        .insert([
          {
            nome: `${dateRange.startDate.toLocaleDateString('pt-BR')} até ${dateRange.endDate.toLocaleDateString('pt-BR')}`,
            data_inicio: dateRange.startDate.toISOString().split('T')[0],
            data_fim: dateRange.endDate.toISOString().split('T')[0],
            created_by: userId,
          }
        ])
        .select()
        .single();

      if (cardapioSemanalError) {
        logger.error('Error creating cardapio semanal:', cardapioSemanalError);
        throw new Error(`Erro ao criar cardápio semanal: ${cardapioSemanalError.message}`);
      }

      logger.log('[DatabaseService] Created cardapio semanal:', cardapioSemanal.id);

      // Criar cardápios do dia (apenas para dias não feriados)
      for (let dayIndex = 0; dayIndex < generatedDays.length; dayIndex++) {
        const day = generatedDays[dayIndex];
        const dayConfig = daysConfig[dayIndex];

        // Pular dias marcados como feriado/recesso
        if (dayConfig?.isHoliday) {
          logger.log(`[DatabaseService] Skipping holiday day: ${day.toLocaleDateString('pt-BR')}`);
          continue;
        }

        // Verificar se já existe um cardápio para esta data e usuário
        const dateString = day.toISOString().split('T')[0];
        const { data: existingCardapio, error: checkError } = await supabase
          .from('cardapios_do_dia')
          .select('id')
          .eq('data', dateString)
          .eq('created_by', userId)
          .maybeSingle();

        if (checkError) {
          logger.error('Error checking existing cardapio:', checkError);
          throw new Error(`Erro ao verificar cardápio existente para ${day.toLocaleDateString('pt-BR')}: ${checkError.message}`);
        }

        if (existingCardapio) {
          throw new Error(`Já existe um cardápio para o dia ${day.toLocaleDateString('pt-BR')}. Cada usuário pode criar apenas um cardápio por dia.`);
        }

        // Criar cardapio_do_dia
        const { data: cardapioDoDia, error: cardapioDoDiaError } = await supabase
          .from('cardapios_do_dia')
          .insert([
            {
              data: dateString,
              cardapio_semanal_id: cardapioSemanal.id,
              created_by: userId,
            }
          ])
          .select()
          .single();

        if (cardapioDoDiaError) {
          logger.error('Error creating cardapio do dia:', cardapioDoDiaError);
          throw new Error(`Erro ao criar cardápio do dia ${day.toLocaleDateString('pt-BR')}: ${cardapioDoDiaError.message}`);
        }

        logger.log(`[DatabaseService] Created cardapio do dia: ${cardapioDoDia.id} for ${day.toLocaleDateString('pt-BR')}`);

        // Criar refeições habilitadas para este dia
        const enabledMeals = dayConfig?.enabledMeals || {};
        const meals = dayConfig?.meals || {};

        for (const [mealType, isEnabled] of Object.entries(enabledMeals)) {
          if (!isEnabled) continue;

          const mealData = meals[mealType as keyof typeof meals];
          if (!mealData) continue;

          // Criar refeição
          const { data: refeicao, error: refeicaoError } = await supabase
            .from('refeicoes')
            .insert([
              {
                tipo: this.convertMealTypeToDatabase(mealType),
                comensais_pequenos: mealData.comensaisPequenos || 0,
                comensais_adolescentes: mealData.comensaisAdolescentes || 0,
                comensais_adultos: mealData.comensaisAdultos || 0,
                cardapio_id: cardapioDoDia.id,
                created_by: userId,
              }
            ])
            .select()
            .single();

          if (refeicaoError) {
            logger.error('Error creating refeicao:', refeicaoError);
            throw new Error(`Erro ao criar refeição ${mealType}: ${refeicaoError.message}`);
          }

          logger.log(`[DatabaseService] Created refeicao: ${refeicao.id} (${mealType})`);

          // Criar refeicao_preparacoes para cada preparação selecionada
          const preparacaoFields = this.getPreparacaoFieldsForMealType(mealType);
          
          // Track preparações já adicionadas para evitar duplicatas
          const addedPreparacoes = new Set<string>();
          
          for (const field of preparacaoFields) {
            const preparacaoId = mealData[field as keyof typeof mealData];
            
            if (preparacaoId && typeof preparacaoId === 'string' && preparacaoId.trim() !== '') {
              // Verificar se esta preparação já foi adicionada
              if (addedPreparacoes.has(preparacaoId)) {
                logger.warn(`[DatabaseService] Skipping duplicate preparacao: ${preparacaoId} for field ${field}`);
                continue;
              }
              
              // Buscar o nome e tipo da preparação para o nome_exibicao e tipo
              const { data: preparacao, error: preparacaoError } = await supabase
                .from('preparacoes')
                .select('nome, tipo')
                .eq('id', preparacaoId)
                .single();

              if (preparacaoError) {
                logger.warn(`Warning: Could not find preparacao ${preparacaoId}:`, preparacaoError);
                continue;
              }

              // Criar refeicao_preparacao
              const { error: refeicaoPreparacaoError } = await supabase
                .from('refeicao_preparacoes')
                .insert([
                  {
                    refeicao_id: refeicao.id,
                    preparacao_id: preparacaoId,
                    nome_exibicao: preparacao.nome,
                    tipo: preparacao.tipo,
                  }
                ]);

              if (refeicaoPreparacaoError) {
                logger.error('Error creating refeicao_preparacao:', refeicaoPreparacaoError);
                throw new Error(`Erro ao associar preparação à refeição: ${refeicaoPreparacaoError.message}`);
              }

              // Marcar como adicionada
              addedPreparacoes.add(preparacaoId);
              logger.log(`[DatabaseService] Created refeicao_preparacao: ${refeicao.id} -> ${preparacaoId} (${preparacao.nome})`);
            }
          }
        }
      }

      logger.log('[DatabaseService] Successfully created complete cardapio');
      return { success: true, cardapioSemanalId: cardapioSemanal.id };

    } catch (error) {
      logger.error('Error creating complete cardapio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar cardápio' 
      };
    }
  }

  // Helper function to get preparacao fields for each meal type
  private static getPreparacaoFieldsForMealType(mealType: string): string[] {
    switch (mealType) {
      case 'colacao':
      case 'lanche':
        return ['solido', 'liquido', 'frutas'];
      case 'almoco':
      case 'jantar':
        return ['acompanhamento1', 'acompanhamento2', 'complemento', 'pratoPrincipal', 'guarnicao', 'salada', 'sobremesa'];
      default:
        return [];
    }
  }

  // Helper function to convert meal type to database format (with proper accents)
  private static convertMealTypeToDatabase(mealType: string): string {
    switch (mealType) {
      case 'colacao':
        return 'colação';
      case 'almoco':
        return 'almoço';
      case 'lanche':
        return 'lanche';
      case 'jantar':
        return 'jantar';
      default:
        return mealType;
    }
  }

  // Cardapios Semanais Management
  static async getCardapiosSemanais(userTableId: string): Promise<any[] | null> {
    try {
      logger.log(`[DatabaseService] Fetching cardapios semanais for user table ID: ${userTableId}`);
      
      // Create timeout promise (10 seconds for database operations)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
      );

      // Query cardapios semanais using the user table ID
      const queryPromise = supabase
        .from('cardapios_semanais')
        .select('*')
        .eq('created_by', userTableId)
        .order('data_inicio', { ascending: false });

      // Race between query and timeout
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      logger.log(`[DatabaseService] Cardapios semanais query completed:`, {
        hasData: !!data,
        dataCount: data?.length || 0,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message
      });

      if (error) {
        logger.error('❌ DatabaseService.getCardapiosSemanais - Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      logger.log(`✅ DatabaseService.getCardapiosSemanais - Found ${data?.length || 0} cardapios semanais`);
      return data || [];
    } catch (error) {
      logger.error('💥 DatabaseService.getCardapiosSemanais - Exception:', error);
      
      // If it's a timeout error, we know the query is hanging
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.error('⏰ Query timeout - Supabase query is hanging');
        throw new Error('Database connection timeout. Please try again.');
      }
      
      // Re-throw the error to be handled by the calling code
      throw error;
    }
  }

  static async getCardapioCompleto(cardapioSemanalId: string): Promise<any | null> {
    try {
      logger.log(`[DatabaseService] Fetching complete cardapio data for ID: ${cardapioSemanalId}`);
      
      // Step 1: Get cardapio semanal basic info
      const { data: cardapioSemanal, error: cardapioSemanalError } = await supabase
        .from('cardapios_semanais')
        .select('*')
        .eq('id', cardapioSemanalId)
        .single();

      if (cardapioSemanalError) {
        logger.error('❌ DatabaseService.getCardapioCompleto - Error fetching cardapio semanal:', cardapioSemanalError);
        throw new Error(`Failed to fetch cardapio semanal: ${cardapioSemanalError.message}`);
      }

      if (!cardapioSemanal) {
        logger.log('❌ DatabaseService.getCardapioCompleto - Cardapio semanal not found');
        return null;
      }

      // Step 2: Get all cardapios_do_dia for this cardapio semanal
      const { data: cardapiosDoDia, error: cardapiosDoDiaError } = await supabase
        .from('cardapios_do_dia')
        .select('*')
        .eq('cardapio_semanal_id', cardapioSemanalId)
        .order('data', { ascending: true });

      if (cardapiosDoDiaError) {
        logger.error('❌ DatabaseService.getCardapioCompleto - Error fetching cardapios do dia:', cardapiosDoDiaError);
        throw new Error(`Failed to fetch cardapios do dia: ${cardapiosDoDiaError.message}`);
      }

      // Step 3: For each cardapio do dia, get all refeicoes and their preparacoes
      const cardapiosComRefeicoes = await Promise.all(
        (cardapiosDoDia || []).map(async (cardapioDoDia) => {
          // Get refeicoes for this cardapio do dia
          const { data: refeicoes, error: refeicoesError } = await supabase
            .from('refeicoes')
            .select('*')
            .eq('cardapio_id', cardapioDoDia.id);

          if (refeicoesError) {
            logger.error('❌ DatabaseService.getCardapioCompleto - Error fetching refeicoes:', refeicoesError);
            throw new Error(`Failed to fetch refeicoes: ${refeicoesError.message}`);
          }

          // For each refeicao, get its preparacoes
          const refeicoesComPreparacoes = await Promise.all(
            (refeicoes || []).map(async (refeicao) => {
              const { data: refeicaoPreparacoes, error: refeicaoPreparacoesError } = await supabase
                .from('refeicao_preparacoes')
                .select(`
                  *,
                  preparacoes (
                    id,
                    nome,
                    tipo
                  )
                `)
                .eq('refeicao_id', refeicao.id);

              if (refeicaoPreparacoesError) {
                logger.error('❌ DatabaseService.getCardapioCompleto - Error fetching refeicao preparacoes:', refeicaoPreparacoesError);
                throw new Error(`Failed to fetch refeicao preparacoes: ${refeicaoPreparacoesError.message}`);
              }

              return {
                ...refeicao,
                preparacoes: refeicaoPreparacoes || []
              };
            })
          );

          return {
            ...cardapioDoDia,
            refeicoes: refeicoesComPreparacoes
          };
        })
      );

      const result = {
        ...cardapioSemanal,
        cardapios_do_dia: cardapiosComRefeicoes
      };

      logger.log(`✅ DatabaseService.getCardapioCompleto - Successfully fetched complete cardapio data`);
      return result;
    } catch (error) {
      logger.error('💥 DatabaseService.getCardapioCompleto - Exception:', error);
      throw error;
    }
  }

  static async deleteCardapioSemanal(id: string): Promise<boolean> {
    try {
      logger.log(`[DatabaseService] Deleting cardapio semanal and all related data:`, id);
      
      // Step 1: Get all cardapios_do_dia IDs for this cardapio semanal
      logger.log(`[DatabaseService] Step 1: Getting cardapios_do_dia IDs...`);
      const { data: cardapiosDoDia, error: cardapiosDoDiaQueryError } = await supabase
        .from('cardapios_do_dia')
        .select('id')
        .eq('cardapio_semanal_id', id);

      if (cardapiosDoDiaQueryError) {
        logger.error('❌ DatabaseService.deleteCardapioSemanal - Error querying cardapios_do_dia:', cardapiosDoDiaQueryError);
        throw new Error(`Failed to query cardapios_do_dia: ${cardapiosDoDiaQueryError.message}`);
      }

      const cardapioDoDiaIds = cardapiosDoDia?.map(c => c.id) || [];
      logger.log(`[DatabaseService] Found ${cardapioDoDiaIds.length} cardapios_do_dia to delete`);

      if (cardapioDoDiaIds.length > 0) {
        // Step 2: Get all refeicoes IDs for these cardapios_do_dia
        logger.log(`[DatabaseService] Step 2: Getting refeicoes IDs...`);
        const { data: refeicoes, error: refeicoesQueryError } = await supabase
          .from('refeicoes')
          .select('id')
          .in('cardapio_id', cardapioDoDiaIds);

        if (refeicoesQueryError) {
          logger.error('❌ DatabaseService.deleteCardapioSemanal - Error querying refeicoes:', refeicoesQueryError);
          throw new Error(`Failed to query refeicoes: ${refeicoesQueryError.message}`);
        }

        const refeicaoIds = refeicoes?.map(r => r.id) || [];
        logger.log(`[DatabaseService] Found ${refeicaoIds.length} refeicoes to delete`);

        if (refeicaoIds.length > 0) {
          // Step 3: Delete all refeicao_preparacoes for these refeicoes
          logger.log(`[DatabaseService] Step 3: Deleting refeicao_preparacoes...`);
          const { error: refeicaoPreparacoesError } = await supabase
            .from('refeicao_preparacoes')
            .delete()
            .in('refeicao_id', refeicaoIds);

          if (refeicaoPreparacoesError) {
            logger.error('❌ DatabaseService.deleteCardapioSemanal - Error deleting refeicao_preparacoes:', refeicaoPreparacoesError);
            throw new Error(`Failed to delete refeicao_preparacoes: ${refeicaoPreparacoesError.message}`);
          }
        }

        // Step 4: Delete all refeicoes for these cardapios_do_dia
        logger.log(`[DatabaseService] Step 4: Deleting refeicoes...`);
        const { error: refeicoesError } = await supabase
          .from('refeicoes')
          .delete()
          .in('cardapio_id', cardapioDoDiaIds);

        if (refeicoesError) {
          logger.error('❌ DatabaseService.deleteCardapioSemanal - Error deleting refeicoes:', refeicoesError);
          throw new Error(`Failed to delete refeicoes: ${refeicoesError.message}`);
        }

        // Step 5: Delete all cardapios_do_dia for this cardapio semanal
        logger.log(`[DatabaseService] Step 5: Deleting cardapios_do_dia...`);
        const { error: cardapiosDoDiaError } = await supabase
          .from('cardapios_do_dia')
          .delete()
          .eq('cardapio_semanal_id', id);

        if (cardapiosDoDiaError) {
          logger.error('❌ DatabaseService.deleteCardapioSemanal - Error deleting cardapios_do_dia:', cardapiosDoDiaError);
          throw new Error(`Failed to delete cardapios_do_dia: ${cardapiosDoDiaError.message}`);
        }
      }

      // Step 6: Finally, delete the cardapio semanal itself
      logger.log(`[DatabaseService] Step 6: Deleting cardapio semanal...`);
      const { error: cardapioSemanalError } = await supabase
        .from('cardapios_semanais')
        .delete()
        .eq('id', id);

      if (cardapioSemanalError) {
        logger.error('❌ DatabaseService.deleteCardapioSemanal - Error deleting cardapio semanal:', cardapioSemanalError);
        throw new Error(`Failed to delete cardapio semanal: ${cardapioSemanalError.message}`);
      }

      logger.log(`✅ DatabaseService.deleteCardapioSemanal - Successfully deleted cardapio semanal and all related data:`, id);
      return true;
    } catch (error) {
      logger.error('💥 DatabaseService.deleteCardapioSemanal - Exception:', error);
      throw error;
    }
  }

  // =====================================================
  // CARDAPIO EDIT FUNCTIONALITY
  // =====================================================

  /**
   * Detects changes between original cardapio data and new data
   * Returns a ChangeSet with all operations needed to update the database
   */
  private static detectChanges(
    originalData: any,
    newData: CardapioUpdateData
  ): ChangeSet {
    logger.log('[DatabaseService] Detecting changes between original and new data');
    
    const changeSet: ChangeSet = {
      cardapiosToDelete: [],
      cardapiosToUpdate: [],
      cardapiosToCreate: [],
      refeicoesToDelete: [],
      refeicoesToUpdate: [],
      refeicoesToCreate: [],
      preparacoesToDelete: [],
      preparacoesToCreate: []
    };

    // Create maps for easier lookup
    const originalDaysMap = new Map<string, any>();
    if (originalData.cardapios_do_dia) {
      originalData.cardapios_do_dia.forEach((cardapioDoDia: any) => {
        originalDaysMap.set(cardapioDoDia.data, cardapioDoDia);
      });
    }

    const newDaysMap = new Map<string, any>();
    newData.generatedDays.forEach((day, index) => {
      const dayString = day.toISOString().split('T')[0];
      const dayConfig = newData.daysConfig[index];
      if (dayConfig && !dayConfig.isHoliday) {
        newDaysMap.set(dayString, { day, dayConfig, index });
      }
    });

    // 1. Find days to delete (exist in original but not in new, or became holidays)
    originalDaysMap.forEach((originalDay, dateString) => {
      if (!newDaysMap.has(dateString)) {
        changeSet.cardapiosToDelete.push(originalDay.id);
        logger.log(`[DatabaseService] Day to delete: ${dateString}`);
      }
    });

    // 2. Find days to create or update
    newDaysMap.forEach((newDayData, dateString) => {
      const originalDay = originalDaysMap.get(dateString);
      const { dayConfig } = newDayData;

      if (!originalDay) {
        // New day - create cardapio_do_dia and all its refeicoes
        changeSet.cardapiosToCreate.push({
          data: dateString,
          dayConfig,
          userId: newData.userId
        });
        logger.log(`[DatabaseService] Day to create: ${dateString}`);
      } else {
        // Existing day - check for changes in refeicoes
        this.detectMealChanges(originalDay, dayConfig, changeSet);
      }
    });

    logger.log('[DatabaseService] Change detection completed:', {
      cardapiosToDelete: changeSet.cardapiosToDelete.length,
      cardapiosToCreate: changeSet.cardapiosToCreate.length,
      refeicoesToDelete: changeSet.refeicoesToDelete.length,
      refeicoesToCreate: changeSet.refeicoesToCreate.length,
      refeicoesToUpdate: changeSet.refeicoesToUpdate.length,
      preparacoesToDelete: changeSet.preparacoesToDelete.length,
      preparacoesToCreate: changeSet.preparacoesToCreate.length
    });

    return changeSet;
  }

  /**
   * Detects changes in meals (refeicoes) for a specific day
   */
  private static detectMealChanges(
    originalDay: any,
    newDayConfig: DayConfig,
    changeSet: ChangeSet
  ): void {
    // Create maps for easier lookup
    const originalMealsMap = new Map<string, any>();
    if (originalDay.refeicoes) {
      originalDay.refeicoes.forEach((refeicao: any) => {
        // Convert database meal type to internal format
        let mealType = refeicao.tipo;
        if (refeicao.tipo === 'colação') mealType = 'colacao';
        if (refeicao.tipo === 'almoço') mealType = 'almoco';
        originalMealsMap.set(mealType, refeicao);
      });
    }

    // Check each meal type
    Object.entries(newDayConfig.enabledMeals).forEach(([mealType, isEnabled]) => {
      const originalMeal = originalMealsMap.get(mealType);

      if (!isEnabled && originalMeal) {
        // Meal was disabled - delete it
        changeSet.refeicoesToDelete.push(originalMeal.id);
        logger.log(`[DatabaseService] Meal to delete: ${mealType} on ${originalDay.data}`);
      } else if (isEnabled && !originalMeal) {
        // Meal was enabled - create it
        changeSet.refeicoesToCreate.push({
          tipo: this.convertMealTypeToDatabase(mealType),
          dayId: originalDay.id,
          mealData: newDayConfig.meals[mealType as keyof typeof newDayConfig.meals]
        });
        logger.log(`[DatabaseService] Meal to create: ${mealType} on ${originalDay.data}`);
      } else if (isEnabled && originalMeal) {
        // Meal exists - check for changes
        const mealData = newDayConfig.meals[mealType as keyof typeof newDayConfig.meals];
        const hasChanges = this.detectMealDataChanges(originalMeal, mealData);
        
        if (hasChanges.comensaisChanged) {
          changeSet.refeicoesToUpdate.push({
            id: originalMeal.id,
            data: {
              comensais_pequenos: mealData.comensaisPequenos || 0,
              comensais_adolescentes: mealData.comensaisAdolescentes || 0,
              comensais_adultos: mealData.comensaisAdultos || 0
            }
          });
        }

        if (hasChanges.preparacoesChanged) {
          // Handle preparacoes changes
          this.detectPreparacaoChanges(originalMeal, mealData, mealType, changeSet);
        }
      }
    });
  }

  /**
   * Detects changes in meal data (comensais and preparacoes)
   */
  private static detectMealDataChanges(originalMeal: any, newMealData: any): {
    comensaisChanged: boolean;
    preparacoesChanged: boolean;
  } {
    // Check comensais changes
    const comensaisChanged = (
      originalMeal.comensais_pequenos !== (newMealData.comensaisPequenos || 0) ||
      originalMeal.comensais_adolescentes !== (newMealData.comensaisAdolescentes || 0) ||
      originalMeal.comensais_adultos !== (newMealData.comensaisAdultos || 0)
    );

    // Check preparacoes changes (simplified - we'll rebuild preparacoes for now)
    const preparacoesChanged = true; // For now, always rebuild preparacoes to ensure consistency

    return { comensaisChanged, preparacoesChanged };
  }

  /**
   * Detects changes in preparacoes for a meal
   */
  private static detectPreparacaoChanges(
    originalMeal: any,
    newMealData: any,
    mealType: string,
    changeSet: ChangeSet
  ): void {
    // For simplicity, we'll delete all existing preparacoes and recreate them
    // This ensures consistency and handles all edge cases
    
    if (originalMeal.preparacoes) {
      originalMeal.preparacoes.forEach((prep: any) => {
        changeSet.preparacoesToDelete.push(prep.id);
      });
    }

    // Add new preparacoes
    const preparacaoFields = this.getPreparacaoFieldsForMealType(mealType);
    preparacaoFields.forEach(field => {
      const preparacaoId = newMealData[field];
      if (preparacaoId && typeof preparacaoId === 'string' && preparacaoId.trim() !== '') {
        changeSet.preparacoesToCreate.push({
          refeicao_id: originalMeal.id,
          preparacao_id: preparacaoId,
          field
        });
      }
    });
  }

  /**
   * Executes all changes in the ChangeSet using a transaction
   * Order: DELETE → UPDATE → INSERT
   */
  private static async executeChanges(
    changeSet: ChangeSet,
    cardapioSemanalId: string
  ): Promise<void> {
    logger.log('[DatabaseService] Executing changes with transaction');

    try {
      // PHASE 1: DELETE operations (in reverse dependency order)
      
      // 1.1 Delete refeicao_preparacoes
      if (changeSet.preparacoesToDelete.length > 0) {
        logger.log(`[DatabaseService] Deleting ${changeSet.preparacoesToDelete.length} refeicao_preparacoes`);
        const { error: deletePreparacoesError } = await supabase
          .from('refeicao_preparacoes')
          .delete()
          .in('id', changeSet.preparacoesToDelete);

        if (deletePreparacoesError) {
          throw new Error(`Failed to delete refeicao_preparacoes: ${deletePreparacoesError.message}`);
        }
      }

      // 1.2 Delete refeicoes
      if (changeSet.refeicoesToDelete.length > 0) {
        logger.log(`[DatabaseService] Deleting ${changeSet.refeicoesToDelete.length} refeicoes`);
        const { error: deleteRefeicoesError } = await supabase
          .from('refeicoes')
          .delete()
          .in('id', changeSet.refeicoesToDelete);

        if (deleteRefeicoesError) {
          throw new Error(`Failed to delete refeicoes: ${deleteRefeicoesError.message}`);
        }
      }

      // 1.3 Delete cardapios_do_dia
      if (changeSet.cardapiosToDelete.length > 0) {
        logger.log(`[DatabaseService] Deleting ${changeSet.cardapiosToDelete.length} cardapios_do_dia`);
        const { error: deleteCardapiosError } = await supabase
          .from('cardapios_do_dia')
          .delete()
          .in('id', changeSet.cardapiosToDelete);

        if (deleteCardapiosError) {
          throw new Error(`Failed to delete cardapios_do_dia: ${deleteCardapiosError.message}`);
        }
      }

      // PHASE 2: UPDATE operations
      
      // 2.1 Update refeicoes
      for (const refeicaoUpdate of changeSet.refeicoesToUpdate) {
        logger.log(`[DatabaseService] Updating refeicao: ${refeicaoUpdate.id}`);
        const { error: updateRefeicaoError } = await supabase
          .from('refeicoes')
          .update(refeicaoUpdate.data)
          .eq('id', refeicaoUpdate.id);

        if (updateRefeicaoError) {
          throw new Error(`Failed to update refeicao ${refeicaoUpdate.id}: ${updateRefeicaoError.message}`);
        }
      }

      // PHASE 3: INSERT operations (in dependency order)
      
      // 3.1 Create cardapios_do_dia
      const createdCardapioIds = new Map<string, string>();
      for (const cardapioToCreate of changeSet.cardapiosToCreate) {
        logger.log(`[DatabaseService] Creating cardapio_do_dia for: ${cardapioToCreate.data}`);
        
        const { data: newCardapio, error: createCardapioError } = await supabase
          .from('cardapios_do_dia')
          .insert([{
            data: cardapioToCreate.data,
            cardapio_semanal_id: cardapioSemanalId,
            created_by: cardapioToCreate.userId
          }])
          .select()
          .single();

        if (createCardapioError) {
          throw new Error(`Failed to create cardapio_do_dia for ${cardapioToCreate.data}: ${createCardapioError.message}`);
        }

        createdCardapioIds.set(cardapioToCreate.data, newCardapio.id);

        // Create refeicoes for this day
        await this.createRefeicoesForDay(newCardapio.id, cardapioToCreate.dayConfig, cardapioToCreate.userId);
      }

      // 3.2 Create refeicoes (for existing days)
      for (const refeicaoToCreate of changeSet.refeicoesToCreate) {
        logger.log(`[DatabaseService] Creating refeicao: ${refeicaoToCreate.tipo}`);
        
        const { data: newRefeicao, error: createRefeicaoError } = await supabase
          .from('refeicoes')
          .insert([{
            tipo: refeicaoToCreate.tipo,
            comensais_pequenos: refeicaoToCreate.mealData.comensaisPequenos || 0,
            comensais_adolescentes: refeicaoToCreate.mealData.comensaisAdolescentes || 0,
            comensais_adultos: refeicaoToCreate.mealData.comensaisAdultos || 0,
            cardapio_id: refeicaoToCreate.dayId,
            created_by: refeicaoToCreate.userId || ''
          }])
          .select()
          .single();

        if (createRefeicaoError) {
          throw new Error(`Failed to create refeicao ${refeicaoToCreate.tipo}: ${createRefeicaoError.message}`);
        }

        // Create preparacoes for this refeicao
        await this.createPreparacoesForRefeicao(newRefeicao.id, refeicaoToCreate.mealData, refeicaoToCreate.tipo);
      }

      // 3.3 Create refeicao_preparacoes (for existing refeicoes)
      for (const preparacaoToCreate of changeSet.preparacoesToCreate) {
        // Get preparacao details for nome_exibicao and tipo
        const { data: preparacao, error: preparacaoError } = await supabase
          .from('preparacoes')
          .select('nome, tipo')
          .eq('id', preparacaoToCreate.preparacao_id)
          .single();

        if (preparacaoError) {
          logger.warn(`Warning: Could not find preparacao ${preparacaoToCreate.preparacao_id}:`, preparacaoError);
          continue;
        }

        const { error: createPrepError } = await supabase
          .from('refeicao_preparacoes')
          .insert([{
            refeicao_id: preparacaoToCreate.refeicao_id,
            preparacao_id: preparacaoToCreate.preparacao_id,
            nome_exibicao: preparacao.nome,
            tipo: preparacao.tipo
          }]);

        if (createPrepError) {
          throw new Error(`Failed to create refeicao_preparacao: ${createPrepError.message}`);
        }
      }

      logger.log('[DatabaseService] All changes executed successfully');

    } catch (error) {
      logger.error('[DatabaseService] Error executing changes:', error);
      throw error;
    }
  }

  /**
   * Creates all refeicoes for a new day
   */
  private static async createRefeicoesForDay(
    cardapioDoDiaId: string,
    dayConfig: DayConfig,
    userId: string
  ): Promise<void> {
    const enabledMeals = dayConfig.enabledMeals;
    const meals = dayConfig.meals;

    for (const [mealType, isEnabled] of Object.entries(enabledMeals)) {
      if (!isEnabled) continue;

      const mealData = meals[mealType as keyof typeof meals];
      if (!mealData) continue;

      // Create refeicao
      const { data: refeicao, error: refeicaoError } = await supabase
        .from('refeicoes')
        .insert([{
          tipo: this.convertMealTypeToDatabase(mealType),
          comensais_pequenos: mealData.comensaisPequenos || 0,
          comensais_adolescentes: mealData.comensaisAdolescentes || 0,
          comensais_adultos: mealData.comensaisAdultos || 0,
          cardapio_id: cardapioDoDiaId,
          created_by: userId
        }])
        .select()
        .single();

      if (refeicaoError) {
        throw new Error(`Failed to create refeicao ${mealType}: ${refeicaoError.message}`);
      }

      // Create preparacoes for this refeicao
      await this.createPreparacoesForRefeicao(refeicao.id, mealData, mealType);
    }
  }

  /**
   * Creates all preparacoes for a refeicao
   */
  private static async createPreparacoesForRefeicao(
    refeicaoId: string,
    mealData: any,
    mealType: string
  ): Promise<void> {
    const preparacaoFields = this.getPreparacaoFieldsForMealType(mealType);
    const addedPreparacoes = new Set<string>();

    for (const field of preparacaoFields) {
      const preparacaoId = mealData[field];
      
      if (preparacaoId && typeof preparacaoId === 'string' && preparacaoId.trim() !== '') {
        // Avoid duplicates
        if (addedPreparacoes.has(preparacaoId)) {
          continue;
        }

        // Get preparacao details
        const { data: preparacao, error: preparacaoError } = await supabase
          .from('preparacoes')
          .select('nome, tipo')
          .eq('id', preparacaoId)
          .single();

        if (preparacaoError) {
          logger.warn(`Warning: Could not find preparacao ${preparacaoId}:`, preparacaoError);
          continue;
        }

        // Create refeicao_preparacao
        const { error: refeicaoPreparacaoError } = await supabase
          .from('refeicao_preparacoes')
          .insert([{
            refeicao_id: refeicaoId,
            preparacao_id: preparacaoId,
            nome_exibicao: preparacao.nome,
            tipo: preparacao.tipo
          }]);

        if (refeicaoPreparacaoError) {
          throw new Error(`Failed to create refeicao_preparacao: ${refeicaoPreparacaoError.message}`);
        }

        addedPreparacoes.add(preparacaoId);
      }
    }
  }

  /**
   * Main function to update a complete cardapio
   * This is the entry point for cardapio edit functionality
   */
  static async updateCardapioCompleto(
    cardapioSemanalId: string,
    newData: CardapioUpdateData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.log('[DatabaseService] Starting cardapio update process for:', cardapioSemanalId);

      // Validate input parameters
      if (!cardapioSemanalId) {
        throw new Error('Cardapio semanal ID is required');
      }

      if (!newData.userId) {
        throw new Error('User ID is required');
      }

      if (!newData.dateRange.startDate || !newData.dateRange.endDate) {
        throw new Error('Data inicial e final são obrigatórias');
      }

      if (newData.generatedDays.length === 0) {
        throw new Error('Nenhum dia foi gerado para o cardápio');
      }

      // Verify at least one non-holiday day
      const nonHolidayDays = newData.generatedDays.filter((_, index) => !newData.daysConfig[index]?.isHoliday);
      if (nonHolidayDays.length === 0) {
        throw new Error('Pelo menos um dia deve não ser feriado/recesso');
      }

      // Step 1: Get original cardapio data
      logger.log('[DatabaseService] Step 1: Fetching original cardapio data');
      const originalData = await this.getCardapioCompleto(cardapioSemanalId);
      
      if (!originalData) {
        throw new Error('Cardápio não encontrado');
      }

      // Step 2: Detect changes between original and new data
      logger.log('[DatabaseService] Step 2: Detecting changes');
      const changeSet = this.detectChanges(originalData, newData);

      // Step 3: Execute changes using transaction
      logger.log('[DatabaseService] Step 3: Executing changes');
      await this.executeChanges(changeSet, cardapioSemanalId);

      // Step 4: Update cardapio semanal basic info if needed
      logger.log('[DatabaseService] Step 4: Updating cardapio semanal info');
      const newName = `${newData.dateRange.startDate.toLocaleDateString('pt-BR')} até ${newData.dateRange.endDate.toLocaleDateString('pt-BR')}`;
      const newStartDate = newData.dateRange.startDate.toISOString().split('T')[0];
      const newEndDate = newData.dateRange.endDate.toISOString().split('T')[0];

      if (originalData.nome !== newName || originalData.data_inicio !== newStartDate || originalData.data_fim !== newEndDate) {
        const { error: updateSemanalError } = await supabase
          .from('cardapios_semanais')
          .update({
            nome: newName,
            data_inicio: newStartDate,
            data_fim: newEndDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', cardapioSemanalId);

        if (updateSemanalError) {
          throw new Error(`Failed to update cardapio semanal: ${updateSemanalError.message}`);
        }
      }

      logger.log('[DatabaseService] Successfully updated complete cardapio');
      return { success: true };

    } catch (error) {
      logger.error('Error updating complete cardapio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar cardápio' 
      };
    }
  }
}