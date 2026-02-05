import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export class ListaComprasService {
  /**
   * Gera uma lista de compras a partir de um cardápio semanal
   * Segue a especificação em LISTA_COMPRAS_SPECIFICATION.md
   */
  static async gerarListaCompras(cardapioSemanalId: string, userId: string): Promise<{ success: boolean; listaId?: string; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Gerando lista de compras para cardápio: ${cardapioSemanalId}`);
      logger.log(`[ListaComprasService] User ID: ${userId}`);

      // 1. Buscar informações do cardápio semanal
      const { data: cardapioSemanal, error: cardapioError } = await supabase
        .from('cardapios_semanais')
        .select('nome, data_inicio, data_fim, created_by')
        .eq('id', cardapioSemanalId)
        .single();

      if (cardapioError) {
        logger.error('[ListaComprasService] Erro ao buscar cardápio:', cardapioError);
        throw new Error(`Erro ao buscar cardápio: ${cardapioError.message}`);
      }

      if (!cardapioSemanal) {
        throw new Error('Cardápio não encontrado');
      }

      logger.log(`[ListaComprasService] Cardápio encontrado:`, cardapioSemanal);

      // 2. Buscar fatores de faixa etária do usuário (ou usar padrões)
      const { data: fatores } = await supabase
        .from('fatores_faixa_etaria')
        .select('fator_pequenos, fator_adolescentes, fator_adultos')
        .eq('user_id', userId)
        .single();

      const fatorPequenos = fatores?.fator_pequenos || 0.60;
      const fatorAdolescentes = fatores?.fator_adolescentes || 0.80;
      const fatorAdultos = fatores?.fator_adultos || 1.00;

      // 3. Buscar todos os ingredientes do cardápio com cálculos
      // Query complexa seguindo a especificação
      const { data: ingredientesData, error: queryError } = await supabase
        .from('cardapios_do_dia')
        .select(`
          data,
          refeicoes (
            id,
            tipo,
            comensais_pequenos,
            comensais_adolescentes,
            comensais_adultos,
            refeicao_preparacoes (
              preparacao_id,
              preparacoes (
                nome,
                ingrediente_preparacao (
                  quantidade_por_per_capita,
                  ingredientes (
                    id,
                    nome,
                    unidade_medida,
                    fator_de_correcao
                  )
                )
              )
            )
          )
        `)
        .eq('cardapio_semanal_id', cardapioSemanalId)
        .gte('data', cardapioSemanal.data_inicio)
        .lte('data', cardapioSemanal.data_fim);

      if (queryError) {
        logger.error('[ListaComprasService] Erro ao buscar dados do cardápio:', queryError);
        throw new Error(`Erro ao buscar dados do cardápio: ${queryError.message}`);
      }

      if (!ingredientesData || ingredientesData.length === 0) {
        throw new Error('Nenhum dado encontrado no cardápio');
      }

      // 4. Processar e agrupar ingredientes
      const ingredientesMap = new Map<string, any>();

      for (const dia of ingredientesData) {
        if (!dia.refeicoes) continue;

        for (const refeicao of dia.refeicoes as any[]) {
          if (!refeicao.refeicao_preparacoes) continue;

          for (const refPrep of refeicao.refeicao_preparacoes) {
            if (!refPrep.preparacoes?.ingrediente_preparacao) continue;

            for (const ingPrep of refPrep.preparacoes.ingrediente_preparacao) {
              const ingrediente = ingPrep.ingredientes;
              if (!ingrediente) continue;

              const quantidadePorPerCapita = ingPrep.quantidade_por_per_capita || 0;
              const comensaisPequenos = refeicao.comensais_pequenos || 0;
              const comensaisAdolescentes = refeicao.comensais_adolescentes || 0;
              const comensaisAdultos = refeicao.comensais_adultos || 0;
              const fatorCorrecao = ingrediente.fator_de_correcao || 1.0;

              // Calcular quantidade parcial para esta refeição
              const quantidadeParcial = quantidadePorPerCapita * (
                (comensaisPequenos * fatorPequenos) +
                (comensaisAdolescentes * fatorAdolescentes) +
                (comensaisAdultos * fatorAdultos)
              ) * fatorCorrecao;

              // Agrupar por ingrediente
              if (!ingredientesMap.has(ingrediente.id)) {
                ingredientesMap.set(ingrediente.id, {
                  ingrediente_id: ingrediente.id,
                  ingrediente_nome: ingrediente.nome,
                  unidade_medida: ingrediente.unidade_medida,
                  fator_correcao: fatorCorrecao,
                  quantidade_total: 0,
                  detalhes_calculo: {
                    breakdown: []
                  }
                });
              }

              const item = ingredientesMap.get(ingrediente.id);
              item.quantidade_total += quantidadeParcial;
              item.detalhes_calculo.breakdown.push({
                data: dia.data,
                tipo_refeicao: refeicao.tipo,
                preparacao: refPrep.preparacoes.nome,
                quantidade_per_capita: quantidadePorPerCapita,
                comensais: {
                  pequenos: comensaisPequenos,
                  adolescentes: comensaisAdolescentes,
                  adultos: comensaisAdultos
                },
                fatores: {
                  pequenos: fatorPequenos,
                  adolescentes: fatorAdolescentes,
                  adultos: fatorAdultos
                },
                fator_correcao: fatorCorrecao,
                quantidade_parcial: quantidadeParcial
              });
            }
          }
        }
      }

      const ingredientesCalculados = Array.from(ingredientesMap.values());

      if (ingredientesCalculados.length === 0) {
        throw new Error('Nenhum ingrediente encontrado no cardápio');
      }

      // 5. Criar registro na tabela listas_compras
      const nomeListaCompras = `Lista de Compras - ${cardapioSemanal.nome}`;
      
      const { data: novaLista, error: listaError } = await supabase
        .from('listas_compras')
        .insert([{
          cardapio_semanal_id: cardapioSemanalId,
          nome: nomeListaCompras,
          data_inicial: cardapioSemanal.data_inicio,
          data_final: cardapioSemanal.data_fim,
          status: 'rascunho',
          created_by: userId
        }])
        .select()
        .single();

      if (listaError || !novaLista) {
        throw new Error(`Erro ao criar lista de compras: ${listaError?.message}`);
      }

      logger.log(`[ListaComprasService] Lista de compras criada: ${novaLista.id}`);

      // 6. Criar itens da lista de compras
      const itensParaInserir = ingredientesCalculados.map((item) => ({
        lista_compras_id: novaLista.id,
        ingrediente_id: item.ingrediente_id,
        ingrediente_nome: item.ingrediente_nome,
        unidade_medida: item.unidade_medida,
        quantidade_calculada: item.quantidade_total,
        quantidade_ajustada: null, // Deixar vazio para o usuário editar posteriormente
        fator_correcao_aplicado: item.fator_correcao,
        detalhes_calculo: item.detalhes_calculo
      }));

      const { error: itensError } = await supabase
        .from('lista_compras_itens')
        .insert(itensParaInserir);

      if (itensError) {
        // Se falhar ao criar itens, deletar a lista criada
        await supabase.from('listas_compras').delete().eq('id', novaLista.id);
        throw new Error(`Erro ao criar itens da lista: ${itensError.message}`);
      }

      // 7. Atualizar flags no cardápio semanal
      const { error: updateError } = await supabase
        .from('cardapios_semanais')
        .update({ 
          lista_compras_gerada: true,
          tem_lista_compras: true 
        })
        .eq('id', cardapioSemanalId);

      if (updateError) {
        logger.warn('[ListaComprasService] Aviso: Não foi possível atualizar flags do cardápio:', updateError);
      }

      logger.log(`[ListaComprasService] Lista de compras gerada com sucesso: ${itensParaInserir.length} itens`);
      
      return { 
        success: true, 
        listaId: novaLista.id 
      };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao gerar lista de compras:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar lista de compras'
      };
    }
  }

  /**
   * Busca uma lista de compras por cardápio semanal
   */
  static async buscarListaComprasPorCardapio(cardapioSemanalId: string, userId: string): Promise<{ success: boolean; lista?: any; itens?: any[]; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Buscando lista de compras para cardápio: ${cardapioSemanalId}`);

      // 1. Buscar a lista de compras
      const { data: lista, error: listaError } = await supabase
        .from('listas_compras')
        .select('*')
        .eq('cardapio_semanal_id', cardapioSemanalId)
        .eq('created_by', userId)
        .single();

      if (listaError) {
        if (listaError.code === 'PGRST116') {
          // Nenhuma lista encontrada
          return { success: false, error: 'Lista de compras não encontrada' };
        }
        throw new Error(`Erro ao buscar lista: ${listaError.message}`);
      }

      // 2. Buscar os itens da lista
      const { data: itens, error: itensError } = await supabase
        .from('lista_compras_itens')
        .select('*')
        .eq('lista_compras_id', lista.id)
        .order('ingrediente_nome');

      if (itensError) {
        throw new Error(`Erro ao buscar itens: ${itensError.message}`);
      }

      logger.log(`[ListaComprasService] Lista encontrada com ${itens?.length || 0} itens`);

      return {
        success: true,
        lista,
        itens: itens || []
      };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao buscar lista de compras:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar lista de compras'
      };
    }
  }

  /**
   * Atualiza a quantidade ajustada de um item da lista
   */
  static async atualizarQuantidadeItem(itemId: string, quantidadeAjustada: number | null, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Atualizando quantidade do item: ${itemId}`);

      // Verificar se o usuário tem permissão para editar este item
      const { data: item, error: checkError } = await supabase
        .from('lista_compras_itens')
        .select(`
          id,
          lista_compras_id,
          listas_compras!inner(created_by)
        `)
        .eq('id', itemId)
        .single();

      if (checkError || !item) {
        throw new Error('Item não encontrado ou sem permissão');
      }

      if ((item as any).listas_compras.created_by !== userId) {
        throw new Error('Sem permissão para editar este item');
      }

      // Atualizar a quantidade
      const { error: updateError } = await supabase
        .from('lista_compras_itens')
        .update({ quantidade_ajustada: quantidadeAjustada })
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`Erro ao atualizar item: ${updateError.message}`);
      }

      logger.log(`[ListaComprasService] Item atualizado com sucesso`);
      return { success: true };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao atualizar item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar item'
      };
    }
  }

  /**
   * Atualiza a unidade de medida de compra de um item da lista
   */
  static async atualizarUnidadeMedidaCompra(itemId: string, unidadeMedidaCompra: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Atualizando unidade de medida de compra do item: ${itemId}`);

      // Verificar se o usuário tem permissão para editar este item
      const { data: item, error: checkError } = await supabase
        .from('lista_compras_itens')
        .select(`
          id,
          lista_compras_id,
          listas_compras!inner(created_by)
        `)
        .eq('id', itemId)
        .single();

      if (checkError || !item) {
        throw new Error('Item não encontrado ou sem permissão');
      }

      if ((item as any).listas_compras.created_by !== userId) {
        throw new Error('Sem permissão para editar este item');
      }

      // Atualizar a unidade de medida de compra
      const { error: updateError } = await supabase
        .from('lista_compras_itens')
        .update({ unidade_medida_compra: unidadeMedidaCompra })
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`Erro ao atualizar unidade de medida: ${updateError.message}`);
      }

      logger.log(`[ListaComprasService] Unidade de medida de compra atualizada com sucesso`);
      return { success: true };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao atualizar unidade de medida:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar unidade de medida'
      };
    }
  }

  /**
   * Adiciona um item manualmente à lista de compras
   */
  static async adicionarItemListaCompras(item: any, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Adicionando item à lista: ${item.ingrediente_nome}`);

      // Verificar se o usuário tem permissão para adicionar a esta lista
      const { data: lista, error: checkError } = await supabase
        .from('listas_compras')
        .select('created_by')
        .eq('id', item.lista_compras_id)
        .single();

      if (checkError || !lista) {
        throw new Error('Lista de compras não encontrada ou sem permissão');
      }

      if (lista.created_by !== userId) {
        throw new Error('Sem permissão para adicionar itens a esta lista');
      }

      // Adicionar o item (removendo o ID temporário)
      const { id, ...itemSemId } = item;
      
      const { error: insertError } = await supabase
        .from('lista_compras_itens')
        .insert([itemSemId]);

      if (insertError) {
        throw new Error(`Erro ao adicionar item: ${insertError.message}`);
      }

      logger.log(`[ListaComprasService] Item adicionado com sucesso`);
      return { success: true };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao adicionar item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao adicionar item'
      };
    }
  }

  /**
   * Deleta um item específico da lista de compras
   */
  static async deletarItemListaCompras(itemId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Deletando item da lista: ${itemId}`);

      // Verificar se o usuário tem permissão para deletar este item
      const { data: item, error: checkError } = await supabase
        .from('lista_compras_itens')
        .select(`
          id,
          lista_compras_id,
          ingrediente_nome,
          listas_compras!inner(created_by)
        `)
        .eq('id', itemId)
        .single();

      if (checkError || !item) {
        throw new Error('Item não encontrado ou sem permissão');
      }

      if ((item as any).listas_compras.created_by !== userId) {
        throw new Error('Sem permissão para deletar este item');
      }

      // Deletar o item
      const { error: deleteError } = await supabase
        .from('lista_compras_itens')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        throw new Error(`Erro ao deletar item: ${deleteError.message}`);
      }

      logger.log(`[ListaComprasService] Item deletado com sucesso: ${item.ingrediente_nome}`);
      return { success: true };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao deletar item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar item'
      };
    }
  }

  /**
   * Deleta uma lista de compras e atualiza o flag do cardápio
   */
  static async deletarListaCompras(listaId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.log(`[ListaComprasService] Deletando lista de compras: ${listaId}`);

      // 1. Buscar informações da lista para obter o cardapio_semanal_id
      const { data: lista, error: listaError } = await supabase
        .from('listas_compras')
        .select('cardapio_semanal_id')
        .eq('id', listaId)
        .eq('created_by', userId) // Verificar se o usuário é o dono
        .single();

      if (listaError || !lista) {
        throw new Error('Lista de compras não encontrada ou sem permissão');
      }

      // 2. Deletar itens da lista primeiro (por causa da foreign key)
      const { error: itensError } = await supabase
        .from('lista_compras_itens')
        .delete()
        .eq('lista_compras_id', listaId);

      if (itensError) {
        throw new Error(`Erro ao deletar itens da lista: ${itensError.message}`);
      }

      // 3. Deletar a lista
      const { error: deleteError } = await supabase
        .from('listas_compras')
        .delete()
        .eq('id', listaId);

      if (deleteError) {
        throw new Error(`Erro ao deletar lista: ${deleteError.message}`);
      }

      // 4. Atualizar flags no cardápio semanal
      const { error: updateError } = await supabase
        .from('cardapios_semanais')
        .update({ 
          lista_compras_gerada: false,
          tem_lista_compras: false 
        })
        .eq('id', lista.cardapio_semanal_id);

      if (updateError) {
        logger.warn('[ListaComprasService] Aviso: Não foi possível atualizar flags do cardápio:', updateError);
      }

      logger.log(`[ListaComprasService] Lista de compras deletada com sucesso`);
      
      return { success: true };

    } catch (error) {
      logger.error('[ListaComprasService] Erro ao deletar lista de compras:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar lista de compras'
      };
    }
  }
}
