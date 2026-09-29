import { relations, sql } from 'drizzle-orm';
import {
	pgTable,
	text,
	timestamp,
	boolean,
	index,
	jsonb,
	unique,
	primaryKey
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

// A single variable that can be referenced in a block
export const variableTable = pgTable(
	'variable',
	{
		id: text('id')
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		name: text('name').notNull(),
		value: text('value').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [unique().on(table.userId, table.name), index('variable_userId_idx').on(table.userId)]
); // each user can only have one variable with this name

// A block of text that may have multiple variables.
export const blockTable = pgTable(
	'block',
	{
		id: text('id')
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		name: text('name').notNull(),
		value: text('value').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [unique().on(table.userId, table.name), index('block_userId_idx').on(table.userId)]
); // each user can only have one block with this name

export const letterTable = pgTable(
	'letter',
	{
		id: text('id')
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		description: text('description'),
		title: text('title').notNull(),
		rawContent: jsonb('raw_content'), // may have substitution strings
		generatedContent: jsonb('generated_content') // has no substitution keys
	},
	(table) => [unique().on(table.userId, table.title), index('letter_userId_idx').on(table.userId)]
);

// Tracks which variables are referenced by a block's value (`{{name}}`).
export const blockVariableTable = pgTable(
	'block_variable',
	{
		blockId: text('block_id')
			.notNull()
			.references(() => blockTable.id, { onDelete: 'restrict' }),
		variableId: text('variable_id')
			.notNull()
			.references(() => variableTable.id, { onDelete: 'restrict' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.blockId, table.variableId] }),
		index('block_variable_block_idx').on(table.blockId),
		index('block_variable_variable_idx').on(table.variableId),
		index('block_variable_user_idx').on(table.userId)
	]
);

// Tracks which blocks are referenced by a letter's sections
export const letterBlockTable = pgTable(
	'letter_block',
	{
		letterId: text('letter_id')
			.notNull()
			.references(() => letterTable.id, { onDelete: 'restrict' }),
		blockId: text('block_id')
			.notNull()
			.references(() => blockTable.id, { onDelete: 'restrict' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.letterId, table.blockId] }),
		index('letter_block_letter_idx').on(table.letterId),
		index('letter_block_block_idx').on(table.blockId),
		index('letter_block_user_idx').on(table.userId)
	]
);

// Tracks which variables are referenced by a letter's sections,
// including variables pulled in via block expansion.
export const letterVariableTable = pgTable(
	'letter_variable',
	{
		letterId: text('letter_id')
			.notNull()
			.references(() => letterTable.id, { onDelete: 'restrict' }),
		variableId: text('variable_id')
			.notNull()
			.references(() => variableTable.id, { onDelete: 'restrict' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.letterId, table.variableId] }),
		index('letter_variable_letter_idx').on(table.letterId),
		index('letter_variable_variable_idx').on(table.variableId),
		index('letter_variable_user_idx').on(table.userId)
	]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	variables: many(variableTable),
	blocks: many(blockTable),
	letters: many(letterTable)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

export const blockVariableRelations = relations(blockVariableTable, ({ one }) => ({
	block: one(blockTable, {
		fields: [blockVariableTable.blockId],
		references: [blockTable.id]
	}),
	variable: one(variableTable, {
		fields: [blockVariableTable.variableId],
		references: [variableTable.id]
	}),
	user: one(user, {
		fields: [blockVariableTable.userId],
		references: [user.id]
	})
}));

export const letterBlockRelations = relations(letterBlockTable, ({ one }) => ({
	letter: one(letterTable, {
		fields: [letterBlockTable.letterId],
		references: [letterTable.id]
	}),
	block: one(blockTable, {
		fields: [letterBlockTable.blockId],
		references: [blockTable.id]
	}),
	user: one(user, {
		fields: [letterBlockTable.userId],
		references: [user.id]
	})
}));

export const letterVariableRelations = relations(letterVariableTable, ({ one }) => ({
	letter: one(letterTable, {
		fields: [letterVariableTable.letterId],
		references: [letterTable.id]
	}),
	variable: one(variableTable, {
		fields: [letterVariableTable.variableId],
		references: [variableTable.id]
	}),
	user: one(user, {
		fields: [letterVariableTable.userId],
		references: [user.id]
	})
}));
