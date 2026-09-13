import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index, jsonb, unique } from 'drizzle-orm/pg-core';

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

// A single variable that can be referenced in a block with the following syntax ${}
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

// A block of text that may have multiple variables. Blocks can be referenced with the following syntax {{  }}
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
	(table) => [unique().on(table.userId, table.name), index("block_userId_idx").on(table.userId)]
); // each user can only have one block with this name

export const letterTable = pgTable('letter', {
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
	generatedContent: text('generated_content') // has no substitution keys
}, (table) => [unique().on(table.userId, table.title), index("letter_userId_idx").on(table.userId)]);


export const letterBlockVersionsTable = pgTable('letter_block_versions', {
	id: text('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	letterId: text('letter_id')
		.notNull()
		.references(() => letterTable.id, { onDelete: 'cascade' }),
	blockId: text('block_id').notNull(), // no foreign key - must survive block deletion
	capturedUpdatedAt: timestamp('captured_updated_at').notNull()
}, (table) => [
  unique().on(table.letterId, table.blockId),
  index('letter_block_versions_blockId_idx').on(table.blockId)
]);

export const letterVariableVersionsTable = pgTable('letter_variable_versions', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  letterId: text('letter_id')
    .notNull()
    .references(() => letterTable.id, { onDelete: 'cascade' }),
  variableId: text('variable_id').notNull(), // no foreign key - must survive variable deletion
  capturedUpdatedAt: timestamp('captured_updated_at').notNull()
}, (table) => [
  unique().on(table.letterId, table.variableId),
  index('letter_variable_versions_variableId_idx').on(table.variableId)
]);

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
