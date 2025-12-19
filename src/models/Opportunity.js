/**
 * @file Opportunity.js
 * @description Opportunity model (sales pipeline)
 */

import { BaseModel } from './BaseModel.js';

export class Opportunity extends BaseModel {
  constructor() {
    super('opportunities');
  }

  /**
   * Search opportunities by name
   */
  search(searchTerm, options = {}) {
    const fields = ['nome', 'descricao'];
    return super.search(searchTerm, fields, options);
  }

  /**
   * Find opportunities by stage
   */
  findByStage(stage, options = {}) {
    return this.findAll({ where: { stage }, ...options });
  }

  /**
   * Find opportunities by status
   */
  findByStatus(status, options = {}) {
    return this.findAll({ where: { status }, ...options });
  }

  /**
   * Find opportunities by account
   */
  findByAccount(accountId, options = {}) {
    return this.findAll({ where: { account_id: accountId }, ...options });
  }

  /**
   * Find opportunities by owner
   */
  findByOwner(ownerId, options = {}) {
    return this.findAll({ where: { owner_id: ownerId }, ...options });
  }

  /**
   * Find open opportunities
   */
  findOpen(options = {}) {
    return this.findAll({ where: { status: 'aberta' }, ...options });
  }

  /**
   * Find won opportunities
   */
  findWon(options = {}) {
    return this.findAll({ where: { status: 'ganha' }, ...options });
  }

  /**
   * Get opportunity with full details
   */
  findByIdWithDetails(opportunityId) {
    const db = this.getDb();
    try {
      const opportunity = this.findById(opportunityId);
      if (!opportunity) return null;

      // Get account
      const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(opportunity.account_id);

      // Get contact
      let contact = null;
      if (opportunity.contact_id) {
        contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(opportunity.contact_id);
      }

      // Get activities
      const activities = db.prepare(`
        SELECT * FROM activities
        WHERE opportunity_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `).all(opportunityId);

      // Get products
      const products = db.prepare(`
        SELECT op.*, p.nome as product_name, p.descricao as product_desc
        FROM opportunity_products op
        LEFT JOIN products p ON op.product_id = p.id
        WHERE op.opportunity_id = ?
      `).all(opportunityId);

      // Calculate total value from products
      const totalProducts = products.reduce((sum, p) => sum + (p.preco_final || 0), 0);

      return {
        ...opportunity,
        account,
        contact,
        activities,
        products,
        totalProducts,
        totalActivities: activities.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update opportunity stage
   */
  updateStage(opportunityId, newStage, probability = null) {
    const updateData = { stage: newStage };
    if (probability !== null) {
      updateData.probabilidade = probability;
    }
    return this.update(opportunityId, updateData);
  }

  /**
   * Mark opportunity as won
   */
  markAsWon(opportunityId) {
    return this.update(opportunityId, {
      status: 'ganha',
      stage: 'fechamento'
    });
  }

  /**
   * Mark opportunity as lost
   */
  markAsLost(opportunityId, motivo, concorrente = null) {
    return this.update(opportunityId, {
      status: 'perdida',
      motivo_perda: motivo,
      concorrente: concorrente
    });
  }

  /**
   * Add product to opportunity
   */
  addProduct(opportunityId, productData) {
    const db = this.getDb();
    try {
      const { product_id, quantidade, preco_unitario, desconto = 0 } = productData;

      const stmt = db.prepare(`
        INSERT INTO opportunity_products (opportunity_id, product_id, quantidade, preco_unitario, desconto)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(opportunityId, product_id, quantidade, preco_unitario, desconto);

      // Recalculate opportunity value
      this.recalculateValue(opportunityId);

      return this.findByIdWithDetails(opportunityId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove product from opportunity
   */
  removeProduct(opportunityId, productId) {
    const db = this.getDb();
    try {
      const stmt = db.prepare(`
        DELETE FROM opportunity_products
        WHERE opportunity_id = ? AND product_id = ?
      `);

      stmt.run(opportunityId, productId);

      // Recalculate opportunity value
      this.recalculateValue(opportunityId);

      return this.findByIdWithDetails(opportunityId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recalculate opportunity total value from products
   */
  recalculateValue(opportunityId) {
    const db = this.getDb();
    try {
      const result = db.prepare(`
        SELECT SUM(preco_final) as total
        FROM opportunity_products
        WHERE opportunity_id = ?
      `).get(opportunityId);

      const total = result.total || 0;

      this.update(opportunityId, { valor: total });

      return total;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pipeline statistics
   */
  getPipelineStats() {
    const db = this.getDb();
    try {
      const byStage = db.prepare(`
        SELECT
          stage,
          COUNT(*) as count,
          SUM(valor) as total_value,
          AVG(probabilidade) as avg_probability
        FROM opportunities
        WHERE status = 'aberta'
        GROUP BY stage
        ORDER BY
          CASE stage
            WHEN 'prospeccao' THEN 1
            WHEN 'qualificacao' THEN 2
            WHEN 'proposta' THEN 3
            WHEN 'negociacao' THEN 4
            WHEN 'fechamento' THEN 5
            ELSE 6
          END
      `).all();

      const total = db.prepare(`
        SELECT
          COUNT(*) as count,
          SUM(valor) as total_value
        FROM opportunities
        WHERE status = 'aberta'
      `).get();

      const won = db.prepare(`
        SELECT
          COUNT(*) as count,
          SUM(valor) as total_value
        FROM opportunities
        WHERE status = 'ganha'
      `).get();

      const lost = db.prepare(`
        SELECT
          COUNT(*) as count,
          SUM(valor) as total_value
        FROM opportunities
        WHERE status = 'perdida'
      `).get();

      // Win rate
      const totalClosed = (won.count || 0) + (lost.count || 0);
      const winRate = totalClosed > 0 ? ((won.count / totalClosed) * 100).toFixed(2) : 0;

      // Average deal size
      const avgDealSize = won.count > 0 ? (won.total_value / won.count).toFixed(2) : 0;

      // Average sales cycle
      const avgCycle = db.prepare(`
        SELECT AVG(ciclo_venda_dias) as avg_days
        FROM opportunities
        WHERE status = 'ganha' AND ciclo_venda_dias IS NOT NULL
      `).get();

      return {
        pipeline: byStage,
        total: total.count || 0,
        totalValue: total.total_value || 0,
        won: won.count || 0,
        wonValue: won.total_value || 0,
        lost: lost.count || 0,
        lostValue: lost.total_value || 0,
        winRate: parseFloat(winRate),
        avgDealSize: parseFloat(avgDealSize),
        avgSalesCycle: avgCycle.avg_days || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create opportunity with validation
   */
  create(data) {
    const opportunityData = {
      stage: 'prospeccao',
      status: 'aberta',
      probabilidade: 0,
      moeda: 'BRL',
      valor: 0,
      produtos: '[]',
      custom_fields: '{}',
      tags: '[]',
      ...data
    };

    if (!opportunityData.id) {
      opportunityData.id = this.generateId();
    }

    return super.create(opportunityData);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default Opportunity;
