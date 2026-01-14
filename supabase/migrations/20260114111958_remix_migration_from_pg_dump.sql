CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'sales'
);


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.orders 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Use email prefix as base username
  base_username := lower(split_part(NEW.email, '@', 1));
  final_username := base_username;
  
  -- Handle duplicates by appending numbers
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (user_id, full_name, username, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), final_username, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sales');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_authenticated() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_name text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    entity_name text,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    store_id uuid NOT NULL,
    sales_user_id uuid,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    whatsapp_sent boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sku text,
    description text,
    default_price numeric(15,2) DEFAULT 0 NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    username text,
    email text
);


--
-- Name: sales_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    target_amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sales_targets_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: store_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    custom_price numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    whatsapp text,
    contact_person text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'sales'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: sales_targets sales_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_targets
    ADD CONSTRAINT sales_targets_pkey PRIMARY KEY (id);


--
-- Name: sales_targets sales_targets_year_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_targets
    ADD CONSTRAINT sales_targets_year_month_key UNIQUE (year, month);


--
-- Name: store_prices store_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_prices
    ADD CONSTRAINT store_prices_pkey PRIMARY KEY (id);


--
-- Name: store_prices store_prices_store_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_prices
    ADD CONSTRAINT store_prices_store_id_product_id_key UNIQUE (store_id, product_id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs USING btree (entity_type);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_profiles_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_targets update_sales_targets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_targets_updated_at BEFORE UPDATE ON public.sales_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: store_prices update_store_prices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_store_prices_updated_at BEFORE UPDATE ON public.store_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stores update_stores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: orders orders_sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_sales_user_id_fkey FOREIGN KEY (sales_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sales_targets sales_targets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_targets
    ADD CONSTRAINT sales_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: store_prices store_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_prices
    ADD CONSTRAINT store_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: store_prices store_prices_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_prices
    ADD CONSTRAINT store_prices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: products Admin can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage products" ON public.products USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admin can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_targets Admin can manage sales targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage sales targets" ON public.sales_targets USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: store_prices Admin can manage store prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage store prices" ON public.store_prices USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stores Admin can manage stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage stores" ON public.stores USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admin can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Anyone can lookup username; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can lookup username" ON public.profiles FOR SELECT TO anon USING (true);


--
-- Name: activity_logs Authenticated users can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: products Authenticated users can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT USING (public.is_authenticated());


--
-- Name: sales_targets Authenticated users can view sales targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view sales targets" ON public.sales_targets FOR SELECT USING (public.is_authenticated());


--
-- Name: store_prices Authenticated users can view store prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view store prices" ON public.store_prices FOR SELECT USING (public.is_authenticated());


--
-- Name: stores Authenticated users can view stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view stores" ON public.stores FOR SELECT USING (public.is_authenticated());


--
-- Name: stores Sales can insert stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sales can insert stores" ON public.stores FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: store_prices Sales can manage store prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sales can manage store prices" ON public.store_prices FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: store_prices Sales can update store prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sales can update store prices" ON public.store_prices FOR UPDATE USING (public.is_authenticated());


--
-- Name: stores Sales can update stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sales can update stores" ON public.stores FOR UPDATE USING (public.is_authenticated());


--
-- Name: order_items Users can create order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: orders Users can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: order_items Users can delete order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete order items" ON public.order_items FOR DELETE USING (public.is_authenticated());


--
-- Name: orders Users can delete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete orders" ON public.orders FOR DELETE USING (public.is_authenticated());


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: order_items Users can update order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update order items" ON public.order_items FOR UPDATE USING (public.is_authenticated());


--
-- Name: orders Users can update own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING (public.is_authenticated());


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: order_items Users can view order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT USING (public.is_authenticated());


--
-- Name: orders Users can view orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view orders" ON public.orders FOR SELECT USING (public.is_authenticated());


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_targets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: store_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;