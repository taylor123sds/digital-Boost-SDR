/**
 * @file ScoringRule.js
 * @description Lead scoring rules and score management
 */

import { BaseModel } from './BaseModel.js';

export class ScoringRule extends BaseModel {
  constructor() {
    super('scoring_rules');
  }

  /**
   * Find all active rules
   */
  findActive() {
    return this.findAll({
      where: { is_active: 1 },
      orderBy: 'priority ASC, created_at ASC'
    });
  }

  /**
   * Find rules by category
   */
  findByCategory(category) {
    return this.findAll({
      where: { category, is_active: 1 },
      orderBy: 'priority ASC'
    });
  }

  /**
   * Toggle rule active status
   */
  toggleActive(ruleId) {
    const db = this.getDb();
    try {
      const rule = this.findById(ruleId);
      if (!rule) return null;

      const stmt = db.prepare('UPDATE scoring_rules SET is_active = ? WHERE id = ?');
      stmt.run(rule.is_active ? 0 : 1, ruleId);

      return this.findById(ruleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get lead score
   */
  getLeadScore(leadId) {
    const db = this.getDb();
    try {
      const stmt = db.prepare('SELECT * FROM lead_scores WHERE lead_id = ?');
      return stmt.get(leadId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate and update lead score
   */
  calculateLeadScore(lead) {
    const db = this.getDb();
    try {
      const rules = this.findActive();

      let profileScore = 0;
      let engagementScore = 0;
      let behaviorScore = 0;
      let customScore = 0;
      const matchedRules = [];

      for (const rule of rules) {
        const matches = this.evaluateRule(rule, lead);

        if (matches) {
          matchedRules.push({
            id: rule.id,
            name: rule.name,
            points: rule.points
          });

          switch (rule.category) {
            case 'profile':
              profileScore += rule.points;
              break;
            case 'engagement':
              engagementScore += rule.points;
              break;
            case 'behavior':
              behaviorScore += rule.points;
              break;
            case 'custom':
              customScore += rule.points;
              break;
          }
        }
      }

      const totalScore = profileScore + engagementScore + behaviorScore + customScore;
      const grade = this.calculateGrade(totalScore);

      // Get existing score for history
      const existingScore = this.getLeadScore(lead.id);

      // Upsert lead score
      const stmt = db.prepare(`
        INSERT INTO lead_scores (id, lead_id, total_score, grade, profile_score, engagement_score, behavior_score, custom_score, rules_matched, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(lead_id) DO UPDATE SET
          total_score = excluded.total_score,
          grade = excluded.grade,
          profile_score = excluded.profile_score,
          engagement_score = excluded.engagement_score,
          behavior_score = excluded.behavior_score,
          custom_score = excluded.custom_score,
          rules_matched = excluded.rules_matched,
          calculated_at = datetime('now'),
          updated_at = datetime('now')
      `);

      stmt.run(
        `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lead.id,
        totalScore,
        grade,
        profileScore,
        engagementScore,
        behaviorScore,
        customScore,
        JSON.stringify(matchedRules)
      );

      // Record history if score changed
      if (existingScore && (existingScore.total_score !== totalScore || existingScore.grade !== grade)) {
        const historyStmt = db.prepare(`
          INSERT INTO score_history (id, lead_id, old_score, new_score, old_grade, new_grade, change_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        historyStmt.run(
          `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lead.id,
          existingScore.total_score,
          totalScore,
          existingScore.grade,
          grade,
          'Recalculated'
        );
      }

      return {
        leadId: lead.id,
        totalScore,
        grade,
        profileScore,
        engagementScore,
        behaviorScore,
        customScore,
        matchedRules
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Evaluate if a rule matches a lead
   */
  evaluateRule(rule, lead) {
    const fieldValue = lead[rule.field];
    const ruleValue = rule.value;
    const ruleValueSecondary = rule.value_secondary;

    switch (rule.operator) {
      case 'equals':
        return String(fieldValue) === String(ruleValue);

      case 'not_equals':
        return String(fieldValue) !== String(ruleValue);

      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(ruleValue).toLowerCase());

      case 'not_contains':
        return !String(fieldValue || '').toLowerCase().includes(String(ruleValue).toLowerCase());

      case 'greater_than':
        return Number(fieldValue) > Number(ruleValue);

      case 'less_than':
        return Number(fieldValue) < Number(ruleValue);

      case 'between':
        return Number(fieldValue) >= Number(ruleValue) && Number(fieldValue) <= Number(ruleValueSecondary);

      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';

      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

      case 'in_list':
        const list = ruleValue.split(',').map(v => v.trim().toLowerCase());
        return list.includes(String(fieldValue).toLowerCase());

      case 'not_in_list':
        const excludeList = ruleValue.split(',').map(v => v.trim().toLowerCase());
        return !excludeList.includes(String(fieldValue).toLowerCase());

      default:
        return false;
    }
  }

  /**
   * Calculate grade from score
   */
  calculateGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  /**
   * Get score history for a lead
   */
  getScoreHistory(leadId, { limit = 50 } = {}) {
    const db = this.getDb();
    try {
      const stmt = db.prepare(`
        SELECT * FROM score_history
        WHERE lead_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(leadId, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leads leaderboard by score
   */
  getLeaderboard({ grade, limit = 50, offset = 0 } = {}) {
    const db = this.getDb();
    try {
      let query = `
        SELECT
          ls.*,
          l.nome,
          l.empresa,
          l.email,
          l.whatsapp,
          l.status,
          l.bant_score
        FROM lead_scores ls
        JOIN leads l ON ls.lead_id = l.id
        WHERE l.status NOT IN ('convertido', 'desqualificado')
      `;
      const params = [];

      if (grade) {
        query += ' AND ls.grade = ?';
        params.push(grade);
      }

      query += ' ORDER BY ls.total_score DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get scoring statistics
   */
  getStats() {
    const db = this.getDb();
    try {
      const gradesStmt = db.prepare(`
        SELECT
          grade,
          COUNT(*) as count,
          AVG(total_score) as avg_score
        FROM lead_scores
        GROUP BY grade
        ORDER BY grade ASC
      `);
      const byGrade = gradesStmt.all();

      const categoriesStmt = db.prepare(`
        SELECT
          AVG(profile_score) as avg_profile,
          AVG(engagement_score) as avg_engagement,
          AVG(behavior_score) as avg_behavior,
          AVG(custom_score) as avg_custom,
          AVG(total_score) as avg_total
        FROM lead_scores
      `);
      const averages = categoriesStmt.get();

      const rulesStmt = db.prepare(`
        SELECT COUNT(*) as total, SUM(is_active) as active FROM scoring_rules
      `);
      const rulesCount = rulesStmt.get();

      return {
        byGrade,
        averages,
        rules: {
          total: rulesCount.total,
          active: rulesCount.active
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create rule with defaults
   */
  create(data) {
    const ruleData = {
      id: this.generateId(),
      category: 'profile',
      is_active: 1,
      priority: 0,
      ...data
    };
    return super.create(ruleData);
  }
}

export default ScoringRule;
