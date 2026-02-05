import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ListaCompras, ListaComprasItem } from '../types';
import { formatQuantityWithUnit } from '../utils/unitConverter';
import { logger } from '../utils/logger';

interface ProfileData {
  nome_escola?: string;
}

export class PDFService {
  /**
   * Gera um PDF da lista de compras
   */
  static gerarListaComprasPDF(
    lista: ListaCompras,
    itens: ListaComprasItem[],
    profile: ProfileData
  ): void {
    try {
      logger.log('[PDFService] Gerando PDF da lista de compras');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Configurações de cores (usando paleta do app)
      const primaryColor: [number, number, number] = [71, 85, 105]; // slate-600
      const secondaryColor: [number, number, number] = [148, 163, 184]; // slate-400
      
      // ===== CABEÇALHO =====
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Lista de Compras', 14, 20);
      
      // Linha decorativa
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 24, pageWidth - 14, 24);
      
      // ===== INFORMAÇÕES DA LISTA =====
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      
      let yPosition = 32;
      
      // Nome da lista
      if (lista.nome) {
        doc.setFont('helvetica', 'bold');
        doc.text('Lista:', 14, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(lista.nome, 35, yPosition);
        yPosition += 6;
      }
      
      // Escola
      if (profile.nome_escola) {
        doc.setFont('helvetica', 'bold');
        doc.text('Escola:', 14, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(profile.nome_escola, 35, yPosition);
        yPosition += 6;
      }
      
      // Período
      doc.setFont('helvetica', 'bold');
      doc.text('Período:', 14, yPosition);
      doc.setFont('helvetica', 'normal');
      const dataInicio = this.formatarData(lista.data_inicial);
      const dataFim = this.formatarData(lista.data_final);
      doc.text(`${dataInicio} a ${dataFim}`, 35, yPosition);
      yPosition += 6;
      
      // Total de itens
      doc.setFont('helvetica', 'bold');
      doc.text('Total de ingredientes:', 14, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${itens.length}`, 60, yPosition);
      yPosition += 10;
      
      // ===== TABELA DE INGREDIENTES =====
      const tableData = itens.map((item) => {
        const qtdCalculada = formatQuantityWithUnit(
          item.quantidade_calculada,
          item.unidade_medida
        );
        
        const qtdAjustada = item.quantidade_ajustada 
          ? item.quantidade_ajustada.toFixed(2)
          : '-';
        
        const medidaCompra = item.unidade_medida_compra || '-';
        
        return [
          item.ingrediente_nome,
          qtdCalculada,
          qtdAjustada,
          medidaCompra
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Ingrediente', 'Qtd. Calculada', 'Qtd. Ajustada', 'Medida da Compra']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [60, 60, 60]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: {
          0: { cellWidth: 'auto' }, // Ingrediente
          1: { cellWidth: 40, halign: 'center' }, // Qtd. Calculada
          2: { cellWidth: 35, halign: 'center' }, // Qtd. Ajustada
          3: { cellWidth: 40, halign: 'center' } // Medida da Compra
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Rodapé em cada página
          const pageCount = doc.getNumberOfPages();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          doc.setFontSize(8);
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
          
          // Data de geração
          const dataGeracao = this.formatarDataHora(new Date());
          doc.text(
            `Gerado em: ${dataGeracao}`,
            14,
            pageHeight - 10
          );
          
          // Número da página
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth - 14,
            pageHeight - 10,
            { align: 'right' }
          );
        }
      });
      
      // ===== SALVAR PDF =====
      const nomeArquivo = this.gerarNomeArquivo(lista);
      doc.save(nomeArquivo);
      
      logger.log(`[PDFService] PDF gerado com sucesso: ${nomeArquivo}`);
    } catch (error) {
      logger.error('[PDFService] Erro ao gerar PDF:', error);
      throw error;
    }
  }
  
  /**
   * Formata data no formato DD/MM/YYYY
   */
  private static formatarData(dataISO: string): string {
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  
  /**
   * Formata data e hora no formato DD/MM/YYYY HH:MM
   */
  private static formatarDataHora(data: Date): string {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
  }
  
  /**
   * Gera nome do arquivo PDF
   */
  private static gerarNomeArquivo(lista: ListaCompras): string {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    
    // Sanitizar nome da lista (remover caracteres especiais)
    const nomeLista = lista.nome
      ? lista.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
          .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
      : 'lista-compras';
    
    return `${nomeLista}-${ano}${mes}${dia}.pdf`;
  }
}
