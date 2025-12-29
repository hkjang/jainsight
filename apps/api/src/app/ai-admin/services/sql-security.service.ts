import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nl2SqlPolicy } from '../entities/nl2sql-policy.entity';

export interface SecurityCheckResult {
    isBlocked: boolean;
    reason?: string;
    sanitizedSql?: string;
    detectedIssues: SecurityIssue[];
}

export interface SecurityIssue {
    type: 'sql_injection' | 'prompt_injection' | 'ddl' | 'dml' | 'pii' | 'blocked_keyword';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
}

@Injectable()
export class SqlSecurityService {
    private readonly logger = new Logger(SqlSecurityService.name);

    // Common SQL injection patterns
    private readonly sqlInjectionPatterns = [
        /(\b(union\s+select|select\s+\*\s+from\s+information_schema)\b)/gi,
        /(\b(exec|execute)\s+(sp_|xp_))/gi,
        /(;\s*(drop|delete|truncate|alter|create)\s+)/gi,
        /(';\s*--)/gi,
        /(or\s+1\s*=\s*1)/gi,
        /(or\s+'[^']*'\s*=\s*'[^']*')/gi,
    ];

    // Prompt injection patterns
    private readonly promptInjectionPatterns = [
        /ignore\s+(all\s+)?previous\s+instructions/gi,
        /forget\s+(all\s+)?previous/gi,
        /disregard\s+(all\s+)?above/gi,
        /system\s*:\s*/gi,
        /\[SYSTEM\]/gi,
        /you\s+are\s+now\s+/gi,
        /pretend\s+to\s+be/gi,
    ];

    // DDL keywords
    private readonly ddlKeywords = [
        'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME', 'GRANT', 'REVOKE'
    ];

    // DML keywords (write operations)
    private readonly dmlKeywords = [
        'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT'
    ];

    // Common PII column names
    private readonly piiColumnPatterns = [
        /\b(ssn|social_security|주민번호|resident_number)\b/gi,
        /\b(credit_card|card_number|카드번호)\b/gi,
        /\b(password|passwd|pwd|비밀번호)\b/gi,
        /\b(phone|mobile|핸드폰|전화번호)\b/gi,
        /\b(email|이메일)\b/gi,
        /\b(address|주소)\b/gi,
        /\b(birth_date|birthday|생년월일)\b/gi,
    ];

    constructor(
        @InjectRepository(Nl2SqlPolicy)
        private readonly policyRepo: Repository<Nl2SqlPolicy>,
    ) {}

    async getActivePolicy(): Promise<Nl2SqlPolicy | null> {
        const policies = await this.policyRepo.find({
            where: { isActive: true },
            order: { priority: 'ASC' },
        });
        return policies.length > 0 ? policies[0] : null;
    }

    async checkPromptSecurity(userInput: string): Promise<SecurityCheckResult> {
        const issues: SecurityIssue[] = [];

        // Check for prompt injection
        for (const pattern of this.promptInjectionPatterns) {
            if (pattern.test(userInput)) {
                issues.push({
                    type: 'prompt_injection',
                    severity: 'critical',
                    description: 'Potential prompt injection detected',
                    location: userInput.match(pattern)?.[0],
                });
            }
        }

        if (issues.some(i => i.severity === 'critical')) {
            return {
                isBlocked: true,
                reason: 'Prompt injection attempt detected',
                detectedIssues: issues,
            };
        }

        return {
            isBlocked: false,
            detectedIssues: issues,
        };
    }

    async checkSqlSecurity(sql: string, policy?: Nl2SqlPolicy): Promise<SecurityCheckResult> {
        const activePolicy = policy || await this.getActivePolicy();
        const issues: SecurityIssue[] = [];
        let sanitizedSql = sql;

        // Check SQL injection patterns
        if (activePolicy?.enableInjectionCheck !== false) {
            for (const pattern of this.sqlInjectionPatterns) {
                if (pattern.test(sql)) {
                    issues.push({
                        type: 'sql_injection',
                        severity: 'critical',
                        description: 'Potential SQL injection pattern detected',
                        location: sql.match(pattern)?.[0],
                    });
                }
            }
        }

        // Check DDL statements
        if (activePolicy?.blockDdl) {
            const upperSql = sql.toUpperCase();
            for (const keyword of this.ddlKeywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(upperSql)) {
                    issues.push({
                        type: 'ddl',
                        severity: 'high',
                        description: `DDL statement (${keyword}) detected`,
                    });
                }
            }
        }

        // Check DML statements
        if (activePolicy?.blockDml) {
            const upperSql = sql.toUpperCase();
            for (const keyword of this.dmlKeywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(upperSql)) {
                    issues.push({
                        type: 'dml',
                        severity: 'medium',
                        description: `DML statement (${keyword}) detected`,
                    });
                }
            }
        }

        // Check blocked keywords from policy
        if (activePolicy?.blockedKeywords) {
            try {
                const keywords = JSON.parse(activePolicy.blockedKeywords) as string[];
                for (const keyword of keywords) {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                    if (regex.test(sql)) {
                        issues.push({
                            type: 'blocked_keyword',
                            severity: 'high',
                            description: `Blocked keyword "${keyword}" detected`,
                        });
                    }
                }
            } catch (e) {
                this.logger.warn('Failed to parse blocked keywords');
            }
        }

        // Check for PII columns
        if (activePolicy?.enablePiiMasking) {
            for (const pattern of this.piiColumnPatterns) {
                const match = sql.match(pattern);
                if (match) {
                    issues.push({
                        type: 'pii',
                        severity: 'medium',
                        description: `Potential PII column access detected: ${match[0]}`,
                    });

                    // Mask PII columns in output
                    sanitizedSql = sanitizedSql.replace(pattern, "'***MASKED***'");
                }
            }
        }

        // Determine if blocked
        const isBlocked = issues.some(i => 
            i.severity === 'critical' || 
            (i.severity === 'high' && (i.type === 'ddl' || i.type === 'blocked_keyword'))
        );

        return {
            isBlocked,
            reason: isBlocked ? issues.filter(i => i.severity === 'critical' || i.severity === 'high')[0]?.description : undefined,
            sanitizedSql,
            detectedIssues: issues,
        };
    }

    addLimitClause(sql: string, maxRows: number = 1000): string {
        const upperSql = sql.toUpperCase().trim();
        
        // Only add LIMIT to SELECT statements
        if (!upperSql.startsWith('SELECT')) {
            return sql;
        }

        // Check if already has LIMIT
        if (/\bLIMIT\s+\d+/i.test(sql)) {
            return sql;
        }

        // Check if already has FETCH FIRST (ANSI SQL)
        if (/FETCH\s+(FIRST|NEXT)\s+\d+/i.test(sql)) {
            return sql;
        }

        // Add LIMIT clause
        return `${sql.replace(/;\s*$/, '')} LIMIT ${maxRows};`;
    }
}
