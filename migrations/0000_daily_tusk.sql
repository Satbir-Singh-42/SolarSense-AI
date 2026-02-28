CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" text,
	"username" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'user' NOT NULL,
	"category" text DEFAULT 'general',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"solar_generation_watts" integer NOT NULL,
	"energy_consumption_watts" integer NOT NULL,
	"battery_level_percent" integer NOT NULL,
	"weather_condition" text,
	"temperature_celsius" integer
);
--> statement-breakpoint
CREATE TABLE "energy_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_household_id" integer,
	"buyer_household_id" integer,
	"energy_amount_kwh" integer NOT NULL,
	"price_per_kwh_rupees" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trade_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"solar_capacity_watts" integer NOT NULL,
	"battery_capacity_kwh" integer NOT NULL,
	"current_battery_percent" integer DEFAULT 50 NOT NULL,
	"is_online" boolean DEFAULT true NOT NULL,
	"coordinates" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_acceptances" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_id" integer NOT NULL,
	"acceptor_user_id" integer NOT NULL,
	"acceptor_household_id" integer NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"contact_shared" boolean DEFAULT false NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone" text,
	"state" text,
	"district" text,
	"household_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_trades" ADD CONSTRAINT "energy_trades_seller_household_id_households_id_fk" FOREIGN KEY ("seller_household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_trades" ADD CONSTRAINT "energy_trades_buyer_household_id_households_id_fk" FOREIGN KEY ("buyer_household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_acceptances" ADD CONSTRAINT "trade_acceptances_trade_id_energy_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."energy_trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_acceptances" ADD CONSTRAINT "trade_acceptances_acceptor_user_id_users_id_fk" FOREIGN KEY ("acceptor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_acceptances" ADD CONSTRAINT "trade_acceptances_acceptor_household_id_households_id_fk" FOREIGN KEY ("acceptor_household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_user_idx" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_session_idx" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "readings_household_ts_idx" ON "energy_readings" USING btree ("household_id","timestamp");--> statement-breakpoint
CREATE INDEX "trades_seller_idx" ON "energy_trades" USING btree ("seller_household_id");--> statement-breakpoint
CREATE INDEX "trades_buyer_idx" ON "energy_trades" USING btree ("buyer_household_id");--> statement-breakpoint
CREATE INDEX "trades_status_idx" ON "energy_trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "households_user_id_idx" ON "households" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "acceptances_trade_idx" ON "trade_acceptances" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "acceptances_user_idx" ON "trade_acceptances" USING btree ("acceptor_user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "user_sessions" USING btree ("expires_at");