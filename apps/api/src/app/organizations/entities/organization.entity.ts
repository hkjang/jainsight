
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface OrganizationSettings {
    allowedAuthSources: ('local' | 'sso' | 'ldap' | 'ad')[];
    defaultUserRole: string;
    sessionTimeout: number; // minutes
    maxFailedLogins: number;
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        expiryDays: number;
    };
    accessTimePolicy: {
        enabled: boolean;
        defaultAllowedDays: number[];
        defaultAllowedHoursStart: number;
        defaultAllowedHoursEnd: number;
        timezone: string;
    };
}

@Entity()
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'simple-json', nullable: true })
    settings: OrganizationSettings;

    @Column({ nullable: true })
    ssoProvider: string;

    @Column({ nullable: true })
    ssoConfig: string; // Encrypted JSON for SSO configuration

    @Column({ nullable: true })
    ldapConfig: string; // Encrypted JSON for LDAP configuration

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
