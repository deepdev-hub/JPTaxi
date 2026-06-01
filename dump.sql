--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

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
-- Name: conversation_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.conversation_type AS ENUM (
    'direct',
    'restaurant'
);


ALTER TYPE public.conversation_type OWNER TO postgres;

--
-- Name: restaurant_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.restaurant_status AS ENUM (
    'draft',
    'open',
    'closed',
    'hidden',
    'deleted'
);


ALTER TYPE public.restaurant_status OWNER TO postgres;

--
-- Name: restaurantstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.restaurantstatus AS ENUM (
    'closed',
    'open'
);


ALTER TYPE public.restaurantstatus OWNER TO postgres;

--
-- Name: review_reaction_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.review_reaction_type AS ENUM (
    'like',
    'dislike'
);


ALTER TYPE public.review_reaction_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'guest',
    'diner',
    'owner',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userrole AS ENUM (
    'diner',
    'guest',
    'owner'
);


ALTER TYPE public.userrole OWNER TO postgres;

--
-- Name: CAST (public.restaurantstatus AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.restaurantstatus AS character varying) WITH INOUT AS IMPLICIT;


--
-- Name: CAST (public.userrole AS character varying); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (public.userrole AS character varying) WITH INOUT AS IMPLICIT;


--
-- Name: CAST (character varying AS public.restaurantstatus); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.restaurantstatus) WITH INOUT AS IMPLICIT;


--
-- Name: CAST (character varying AS public.userrole); Type: CAST; Schema: -; Owner: -
--

CREATE CAST (character varying AS public.userrole) WITH INOUT AS IMPLICIT;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_participants (
    conversation_id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.conversation_participants OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id character varying(50) NOT NULL,
    conversation_type public.conversation_type DEFAULT 'restaurant'::public.conversation_type NOT NULL,
    restaurant_id character varying(50),
    last_message text,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id character varying(50) NOT NULL,
    restaurant_id character varying(50) NOT NULL,
    name_vn character varying(255) NOT NULL,
    name_jp character varying(255),
    price numeric(12,2) NOT NULL,
    description text,
    description_jp text,
    image text,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_menu_item_price CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id character varying(50) NOT NULL,
    conversation_id character varying(50) NOT NULL,
    sender_id character varying(50) NOT NULL,
    receiver_id character varying(50),
    restaurant_id character varying(50),
    content character varying(500) NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_message_content_length CHECK ((char_length((content)::text) <= 500))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expired_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    name character varying(255),
    price double precision
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: restaurant_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurant_images (
    id bigint NOT NULL,
    restaurant_id character varying(50) NOT NULL,
    image_url text NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_restaurant_image_sort_order CHECK ((sort_order > 0))
);


ALTER TABLE public.restaurant_images OWNER TO postgres;

--
-- Name: restaurant_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.restaurant_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.restaurant_images_id_seq OWNER TO postgres;

--
-- Name: restaurant_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.restaurant_images_id_seq OWNED BY public.restaurant_images.id;


--
-- Name: restaurant_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurant_tags (
    id bigint NOT NULL,
    restaurant_id character varying(50) NOT NULL,
    tag_name character varying(100) NOT NULL
);


ALTER TABLE public.restaurant_tags OWNER TO postgres;

--
-- Name: restaurant_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.restaurant_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.restaurant_tags_id_seq OWNER TO postgres;

--
-- Name: restaurant_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.restaurant_tags_id_seq OWNED BY public.restaurant_tags.id;


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurants (
    id character varying(50) NOT NULL,
    owner_id character varying(50) NOT NULL,
    name_vn character varying(255) NOT NULL,
    name_jp character varying(255),
    address text NOT NULL,
    address_jp text,
    phone character varying(50) NOT NULL,
    description text,
    description_jp text,
    cover_image text,
    open_hours character varying(100),
    price_range character varying(100),
    avg_price numeric(12,2) DEFAULT 0,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    status public.restaurant_status DEFAULT 'draft'::public.restaurant_status NOT NULL,
    lat numeric(10,6),
    lng numeric(10,6),
    supports_japanese boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_restaurant_avg_price CHECK ((avg_price >= (0)::numeric)),
    CONSTRAINT chk_restaurant_rating CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT chk_restaurant_review_count CHECK ((review_count >= 0))
);


ALTER TABLE public.restaurants OWNER TO postgres;

--
-- Name: review_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_images (
    id bigint NOT NULL,
    review_id character varying(50) NOT NULL,
    image_url text NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_review_image_sort_order CHECK (((sort_order >= 1) AND (sort_order <= 3)))
);


ALTER TABLE public.review_images OWNER TO postgres;

--
-- Name: review_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.review_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.review_images_id_seq OWNER TO postgres;

--
-- Name: review_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.review_images_id_seq OWNED BY public.review_images.id;


--
-- Name: review_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_reactions (
    id bigint NOT NULL,
    review_id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    reaction_type public.review_reaction_type NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.review_reactions OWNER TO postgres;

--
-- Name: review_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.review_reactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.review_reactions_id_seq OWNER TO postgres;

--
-- Name: review_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.review_reactions_id_seq OWNED BY public.review_reactions.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id character varying(50) NOT NULL,
    restaurant_id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    dislikes_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_review_dislikes CHECK ((dislikes_count >= 0)),
    CONSTRAINT chk_review_likes CHECK ((likes_count >= 0)),
    CONSTRAINT chk_review_rating CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: share_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.share_links (
    id character varying(50) NOT NULL,
    restaurant_id character varying(50) NOT NULL,
    share_token character varying(255) NOT NULL,
    share_url text NOT NULL,
    qr_code_url text,
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.share_links OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    name_jp character varying(255),
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(50),
    address text,
    avatar text,
    role public.user_role DEFAULT 'diner'::public.user_role NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: restaurant_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_images ALTER COLUMN id SET DEFAULT nextval('public.restaurant_images_id_seq'::regclass);


--
-- Name: restaurant_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_tags ALTER COLUMN id SET DEFAULT nextval('public.restaurant_tags_id_seq'::regclass);


--
-- Name: review_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_images ALTER COLUMN id SET DEFAULT nextval('public.review_images_id_seq'::regclass);


--
-- Name: review_reactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_reactions ALTER COLUMN id SET DEFAULT nextval('public.review_reactions_id_seq'::regclass);


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_participants (conversation_id, user_id, joined_at) FROM stdin;
conv1	u1	2026-05-01 17:50:52.078348
conv1	u2	2026-05-01 17:50:52.078348
conv2	u3	2026-05-01 17:50:52.078348
conv2	u4	2026-05-01 17:50:52.078348
conv-3a12d9a0-3786-403a-b483-e456ecb0842e	u1	2026-05-13 18:58:19.597864
conv-3a12d9a0-3786-403a-b483-e456ecb0842e	u4	2026-05-13 18:58:19.597864
conv-e3b76f8f-5838-4040-8d72-276763a79cc6	u2	2026-05-23 19:43:46.468484
conv-e3b76f8f-5838-4040-8d72-276763a79cc6	u4	2026-05-23 19:43:46.471131
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, conversation_type, restaurant_id, last_message, last_message_at, created_at, updated_at) FROM stdin;
conv2	restaurant	r2	21時まで営業しております。	2026-03-26 11:35:00	2026-05-01 17:50:52.076803	2026-05-01 17:50:52.076803
conv-3a12d9a0-3786-403a-b483-e456ecb0842e	restaurant	r4	ihkjk	2026-05-13 19:20:37.973611	2026-05-13 18:58:19.592001	2026-05-13 19:20:37.973611
conv-e3b76f8f-5838-4040-8d72-276763a79cc6	restaurant	r4	kk	2026-05-23 19:43:49.143951	2026-05-23 19:43:46.461386	2026-05-23 19:43:49.158855
conv1	restaurant	r1	ljfkdsjll	2026-06-01 19:58:24.094302	2026-05-01 17:50:52.076803	2026-06-01 19:58:24.102276
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, restaurant_id, name_vn, name_jp, price, description, description_jp, image, is_available, created_at, updated_at) FROM stdin;
m4	r2	Bún chả thường	ブンチャー（レギュラー）	55000.00	Bún, chả miếng, chả viên, nước mắm	\N	\N	t	2026-05-01 17:50:52.060956	2026-05-01 17:50:52.060956
m5	r2	Bún chả đặc biệt	ブンチャー（スペシャル）	75000.00	Bún, chả, nem cuốn, nước mắm đặc biệt	\N	\N	t	2026-05-01 17:50:52.060956	2026-05-01 17:50:52.060956
m8	r4	Bánh mì thịt nguội	コールドカットバインミー	30000.00	Pate, giăm bông, chả lụa, dưa góp	\N	\N	t	2026-05-01 17:50:52.060956	2026-05-01 17:50:52.060956
m9	r4	Bánh mì trứng	卵バインミー	25000.00	Trứng ốp la, pate, tương ớt	\N	\N	t	2026-05-01 17:50:52.060956	2026-05-01 17:50:52.060956
m-58561909-1bfd-4cf8-9651-720434302c47	r1	Phở bò chín	牛肉フォー（ウェルダン）	65000.00	Thịt bò chín mềm, nước dùng trong	\N	\N	t	2026-05-02 00:14:50.657003	2026-05-02 00:14:50.657003
m-e8378497-2ecb-46a3-91a4-fe4f0c1a7896	r1	Phở bò tái	牛肉フォー（レア）	65000.00	Bánh phở, thịt bò tái, nước dùng xương hầm 12 tiếng	\N	\N	t	2026-05-02 00:14:50.666122	2026-05-02 00:14:50.666122
m-ff3448f3-15db-4b09-b434-53051f457e25	r1	Phở gà	鶏肉フォー	55000.00	Gà ta nấu chín vàng, nước dùng ngọt thanh	\N	\N	t	2026-05-02 00:14:50.666122	2026-05-02 00:14:50.666122
m-42148b33-a550-4ab7-8f63-242f3fa00160	r-c41139f2-dea8-4ea4-b066-5e753d38748c	a	a	5000.00	kjj	\N	\N	t	2026-05-13 19:19:55.137378	2026-05-13 19:19:55.137378
m-22ea5ba6-f15b-4b0d-a46e-ded10c804fb6	r3	Chả cá Lã Vọng	チャーカー・ラーヴォン	180000.00	Cá tẩm nghệ nướng, ăn kèm bún, rau thơm, mắm tôm	\N	\N	t	2026-05-21 12:37:13.242254	2026-05-21 12:37:13.242254
m-4384e961-c130-4634-99b8-85bf56b4df2b	r3	Nem rán	揚げ春巻き	60000.00	Nem rán thịt lợn, mộc nhĩ, miến	\N	\N	t	2026-05-21 12:37:13.244254	2026-05-21 12:37:13.244254
m-d20def68-f1e3-4892-a18d-ca807189cbc3	r-df1f0797-82a6-4b47-9a1a-a46bbacf66c6	s.kfml	jklfjk	3891.00	899	\N	http://localhost:8081/api/restaurants/images/restaurant-7b38d889-158f-4979-baa0-4df19f8b04d4.png	t	2026-06-01 19:56:50.436106	2026-06-01 19:56:50.436106
m-c3b5fea4-48f3-4488-90d2-c12643f8ac90	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	s	a	100000.00	a	\N	http://localhost:8081/api/restaurants/images/restaurant-6bc72b41-077a-49e3-9112-d00a93a4fd64.jpg	t	2026-06-01 19:57:38.173612	2026-06-01 19:57:38.173612
m-b8859381-2c5f-484d-bad8-95a419230df4	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	ldskjgl	ljglsjklg	2498029.00	df	\N	http://localhost:8081/api/restaurants/images/restaurant-5d7db5e5-4bfe-4894-82d0-64c848e44823.jpg	t	2026-06-01 19:57:38.173612	2026-06-01 19:57:38.173612
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, receiver_id, restaurant_id, content, is_read, created_at) FROM stdin;
msg1	conv1	u1	u2	r1	こんにちは！フォーを予約したいのですが、今夜6時に3人で行けますか？	t	2026-03-26 09:00:00
msg2	conv1	u2	u1	r1	はい、もちろんです！6時に3人様、承りました。	t	2026-03-26 09:05:00
msg3	conv1	u1	u2	r1	ありがとうございます！アレルギーは特にありません。	t	2026-03-26 09:10:00
msg4	conv1	u2	u1	r1	承知しました！お待ちしております。	f	2026-03-26 09:12:00
msg5	conv2	u3	u4	r2	すみません、ブンチャーのセットは何時まで注文できますか？	t	2026-03-26 11:30:00
msg6	conv2	u4	u3	r2	21時まで営業しております。	f	2026-03-26 11:35:00
msg-dada1786-1277-4b79-b00e-5f3a2779958c	conv1	u1	u2	r1	abc	f	2026-05-01 22:57:08.669544
msg-1facf9e1-e44d-47fc-ad46-5a9b714c575b	conv1	u1	u2	r1	xyz	f	2026-05-02 00:37:55.861102
msg-dffccbb2-379f-4183-9af4-73f964e6109b	conv1	u2	u1	r1	hi	f	2026-05-13 19:18:04.171729
msg-ad7b4d45-662f-4367-be7a-b22161516ae6	conv-3a12d9a0-3786-403a-b483-e456ecb0842e	u1	u4	r4	ihkjk	f	2026-05-13 19:20:37.973611
msg-ce258ade-5e62-4717-a87e-5102cb56f463	conv1	u1	u2	r1	acd	f	2026-05-13 23:11:51.531426
msg-4dd35ff0-98ba-4eab-8f08-d327511161f6	conv-e3b76f8f-5838-4040-8d72-276763a79cc6	u2	u4	r4	kk	f	2026-05-23 19:43:49.143951
msg-c7c76991-47b3-41cc-9b3f-2c5a975e252e	conv1	u1	u2	r1	ljfkdsjll	f	2026-06-01 19:58:24.094302
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, email, token, expired_at, used, created_at) FROM stdin;
8	luongvanhungnet@gmail.com	SiXiNQApZETbAq9yh9YJKzA8GLB7oXDYn8XjUH4KusM	2026-05-02 20:35:38.665706	f	2026-05-02 20:05:38.692195
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price) FROM stdin;
\.


--
-- Data for Name: restaurant_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.restaurant_images (id, restaurant_id, image_url, sort_order, created_at) FROM stdin;
3	r2	https://images.unsplash.com/photo-1763703544688-2ac7839b0659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800	1	2026-05-01 17:50:52.056407
5	r4	https://images.unsplash.com/photo-1763703686238-bb654515259c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800	1	2026-05-01 17:50:52.056407
8	r1	https://images.unsplash.com/photo-1677837914128-2367031a11e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800	1	2026-05-02 00:14:50.606836
9	r1	https://images.unsplash.com/photo-1738573519644-93b700f3adf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800	2	2026-05-02 00:14:50.632891
17	r-c41139f2-dea8-4ea4-b066-5e753d38748c	https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=400&h=300&fit=crop	1	2026-05-13 19:19:55.130204
18	r-c41139f2-dea8-4ea4-b066-5e753d38748c	https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=400&h=300&fit=crop	2	2026-05-13 19:19:55.133378
23	r3	https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800	1	2026-05-21 12:37:13.221466
54	r-df1f0797-82a6-4b47-9a1a-a46bbacf66c6	http://localhost:8081/api/restaurants/images/restaurant-0fcaef82-bb18-4698-8ffb-cd1e0cf245be.jpg	1	2026-06-01 19:56:50.388979
63	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=400&h=300&fit=crop	1	2026-06-01 19:57:38.157298
64	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=400&h=300&fit=crop	2	2026-06-01 19:57:38.159715
65	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=400&h=300&fit=crop	3	2026-06-01 19:57:38.159715
66	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	http://localhost:8081/api/restaurants/images/restaurant-7641682e-39b4-451e-b80b-dabb5853fc44.jpg	4	2026-06-01 19:57:38.159715
67	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	http://localhost:8081/api/restaurants/images/restaurant-525f6d62-f870-405e-8c3c-1dadec4df7d4.jpg	5	2026-06-01 19:57:38.159715
\.


--
-- Data for Name: restaurant_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.restaurant_tags (id, restaurant_id, tag_name) FROM stdin;
1	r1	Phở/フォー
2	r1	Bò/牛肉
3	r1	Truyền thống/伝統的
4	r1	Sáng/朝食
5	r2	Bún chả/ブンチャー
6	r2	Truyền thống/伝統的
7	r2	Trưa/昼食
8	r3	Truyền thống/伝統的
9	r3	Chả cá/チャーカー
10	r3	Nem/ネム
11	r3	Tối/夕食
12	r4	Bánh mì/バインミー
13	r4	Sáng/朝食
14	r4	Nhanh/早い
15	r4	Rẻ/安い
18	r-c41139f2-dea8-4ea4-b066-5e753d38748c	Rẻ/安い
19	r-c41139f2-dea8-4ea4-b066-5e753d38748c	Bánh mì/バインミー
20	r-c41139f2-dea8-4ea4-b066-5e753d38748c	Sáng/朝食
21	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	Bò/牛肉
23	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	Nhanh/早い
24	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	Rẻ/安い
25	r-df1f0797-82a6-4b47-9a1a-a46bbacf66c6	Bánh mì/バインミー
26	r-df1f0797-82a6-4b47-9a1a-a46bbacf66c6	Bò/牛肉
\.


--
-- Data for Name: restaurants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.restaurants (id, owner_id, name_vn, name_jp, address, address_jp, phone, description, description_jp, cover_image, open_hours, price_range, avg_price, rating, review_count, status, lat, lng, supports_japanese, created_at, updated_at) FROM stdin;
r2	u4	Bún Chả Hà Nội Chị Liên	ハノイ・ブンチャー チ・リエン	24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội	24 レ・ヴァン・フゥー通り、ハイバーチュン、ハノイ	024 3944 5678	Bún chả nổi tiếng Hà Nội, thịt nướng thơm lừng, nước chấm đậm vị.	ハノイで有名なブンチャー専門店。日本語メニューあり。	https://images.unsplash.com/photo-1763703544688-2ac7839b0659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080	10:30 - 21:00	50k - 80k VND	65000.00	4.5	1	open	21.028000	105.852000	t	2026-05-01 17:50:52.048212	2026-05-01 17:50:52.048212
r4	u4	Bánh Mì 25	バインミー25	25 Hàng Cá, Hoàn Kiếm, Hà Nội	25 ハンカー通り、ホアンキエム、ハノイ	024 3828 1112	Bánh mì nổi tiếng phố cổ Hà Nội. Vỏ bánh giòn, nhân đa dạng, giá hợp lý.	ハノイ旧市街で有名なバインミー専門店。	https://images.unsplash.com/photo-1763703686238-bb654515259c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080	06:30 - 20:00	25k - 40k VND	30000.00	5.0	1	open	21.033000	105.849000	t	2026-05-01 17:50:52.048212	2026-05-13 19:16:38.904355
r1	u2	Phở Bắc Cổ Truyền	バックコー伝統フォー	12 Hàng Bún, Hoàn Kiếm, Hà Nội	12 ハンブン通り、ホアンキエム、ハノイ	024 3826 1011	Quán phở truyền thống Hà Nội hơn 30 năm, nước dùng đậm đà, thịt bò tươi ngon.	30年以上の歴史を持つ伝統的なハノイのフォー専門店。日本語でご注文いただけます。	https://images.unsplash.com/photo-1677837914128-2367031a11e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080	06:00 - 22:00	40k - 90k VND	65000.00	2.5	2	open	21.034000	105.847000	t	2026-05-01 17:50:52.048212	2026-05-13 23:14:05.751436
r-c41139f2-dea8-4ea4-b066-5e753d38748c	u2	abc	kjkkkj	kjkjk	\N	kklll	ịljljl	ljllml	https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=400&h=300&fit=crop	10:00 - 21:00	7,778 VND/person	7778.00	3.0	1	open	21.027764	105.834160	f	2026-05-13 19:19:34.32379	2026-05-19 22:14:05.318762
r3	u2	Nhà Hàng Việt Xưa	ベトナム昔レストラン	8 Tống Duy Tân, Hoàn Kiếm, Hà Nội	8 トン・ズイ・タン通り、ホアンキエム、ハノイ	024 3266 7890	Nhà hàng không gian cổ kính Hà Nội xưa, phục vụ các món ăn truyền thống Bắc Bộ.	昔のハノイの雰囲気を再現したレストラン。日本語スタッフ在籍。	https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800	11:00 - 22:30	60k - 200k VND	120000.00	4.8	2	open	21.035000	105.848000	t	2026-05-01 17:50:52.048212	2026-05-21 12:37:13.248252
r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	u2	a	aa	a	\N	a	aA	A	https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=400&h=300&fit=crop	a	10,000 VND/person	10000.00	1.0	1	open	21.027764	105.834160	f	2026-05-21 12:35:50.173103	2026-05-23 20:28:20.996855
r-df1f0797-82a6-4b47-9a1a-a46bbacf66c6	u2	alfjl	ljfl	ljfldj	\N	ljlfsdj	sflkjl	ljfl	http://localhost:8081/api/restaurants/images/restaurant-0fcaef82-bb18-4698-8ffb-cd1e0cf245be.jpg	ljlf	329 VND/person	329.00	0.0	0	closed	21.027764	105.834160	f	2026-06-01 19:56:50.310027	2026-06-01 19:56:50.310027
\.


--
-- Data for Name: review_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.review_images (id, review_id, image_url, sort_order, created_at) FROM stdin;
2	rev4	https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=200&h=200&fit=crop	1	2026-05-01 17:50:52.067451
6	rev-8807939d-c9bc-47e3-a690-89ab991d628d	http://localhost:8081/api/reviews/images/review-c1bca243-1b95-48df-92f0-f6e919c355cc.png	1	2026-05-13 19:16:38.890283
7	rev1	http://localhost:8081/api/reviews/images/review-9f2ed7f2-98db-4d06-8be8-9688ca13dd30.png	1	2026-05-13 23:14:05.6221
8	rev-9424e510-6b2f-4089-9911-23dd8bbf7f3d	http://localhost:8081/api/reviews/images/review-df0cb0b2-4414-4ffa-9f0c-66d5210f232a.png	1	2026-05-19 22:14:05.277359
9	rev-cc8ffe0f-c428-4aaf-a616-d59d7309449a	http://localhost:8081/api/reviews/images/review-8230aaa4-988d-4a8a-a9b7-aedc16f882b0.png	1	2026-05-23 20:28:20.987038
\.


--
-- Data for Name: review_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.review_reactions (id, review_id, user_id, reaction_type, created_at, updated_at) FROM stdin;
1	rev1	u3	like	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
2	rev1	u5	like	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
4	rev3	u3	like	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
5	rev3	u5	dislike	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
6	rev4	u1	like	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
7	rev4	u3	like	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
8	rev4	u5	like	2026-05-01 17:50:52.069143	2026-05-01 17:50:52.069143
11	rev1	u1	like	2026-05-13 18:53:13.859817	2026-05-13 18:53:13.859817
12	rev1	u2	like	2026-05-13 19:17:52.211708	2026-05-13 19:17:52.211708
13	rev2	u2	dislike	2026-05-13 19:17:53.589998	2026-05-13 19:17:53.589998
10	rev2	u1	like	2026-05-13 18:12:09.716972	2026-05-13 23:14:15.973054
14	rev-9424e510-6b2f-4089-9911-23dd8bbf7f3d	u1	like	2026-05-19 22:14:30.119133	2026-05-19 22:14:30.119133
15	rev-cc8ffe0f-c428-4aaf-a616-d59d7309449a	u1	dislike	2026-05-23 20:28:32.645446	2026-05-23 20:28:32.645446
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, restaurant_id, user_id, rating, comment, likes_count, dislikes_count, created_at, updated_at) FROM stdin;
rev3	r2	u1	4	ブンチャーを初めて食べましたが、想像以上に美味しかったです。	1	1	2026-03-18 12:00:00	2026-05-01 17:50:52.063314
rev4	r3	u5	5	接待に使いました。雰囲気、料理の質、サービスの全てが高水準でした。	3	0	2026-03-20 19:00:00	2026-05-01 17:50:52.063314
rev-8807939d-c9bc-47e3-a690-89ab991d628d	r4	u1	5	Thêm ảnh (tùy chọn)\r\nChỉ nhận jpg, jpeg, png, webp. Mỗi ảnh tối đa 10MB, tối đa 3 ảnh\r\n\r\npic1.png\r\n\r\nThêm	0	0	2026-05-13 19:16:38.887709	2026-05-13 19:16:38.888603
rev1	r1	u1	1	Thêm ảnh (tùy chọn)\r\nChỉ nhận jpg, jpeg, png, webp. Mỗi ảnh tối đa 10MB, tối đa 3 ảnh	4	0	2026-03-15 10:00:00	2026-05-13 23:14:05.699345
rev2	r1	u3	4	フォーは美味しかったです。日本語メニューがあるので頼みやすかったです。	1	1	2026-03-10 11:00:00	2026-05-13 23:14:15.970057
rev-9424e510-6b2f-4089-9911-23dd8bbf7f3d	r-c41139f2-dea8-4ea4-b066-5e753d38748c	u1	3	không ngon• 料理の味・見た目について具体的に書く\r\n• スタッフの日本語対応について触れる\r\n• 価格に対するコスパを評価する\r\n• 日本人のお口に合うかどうかを伝える	1	0	2026-05-19 22:14:05.241717	2026-05-19 22:14:30.137072
rev-cc8ffe0f-c428-4aaf-a616-d59d7309449a	r-a28c5cbe-ab23-4a93-8b1e-9900829ed496	u1	1	quán qq kh ăn nxquán qq kh ăn nxquán qq kh ăn nxquán qq kh ăn nxquán qq kh ăn nxquán qq kh ăn nxquán qq kh ăn nx	0	1	2026-05-23 20:28:20.978663	2026-05-23 20:28:32.665789
\.


--
-- Data for Name: share_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.share_links (id, restaurant_id, share_token, share_url, qr_code_url, created_by, created_at) FROM stdin;
share1	r1	pho-bac-co-truyen-r1	http://localhost:5173/restaurants/r1?share=pho-bac-co-truyen-r1	http://localhost:8080/api/share/pho-bac-co-truyen-r1/qr	u1	2026-05-01 17:50:52.074368
share2	r3	nha-hang-viet-xua-r3	http://localhost:5173/restaurants/r3?share=nha-hang-viet-xua-r3	http://localhost:8080/api/share/nha-hang-viet-xua-r3/qr	u5	2026-05-01 17:50:52.074368
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, name_jp, email, password_hash, phone, address, avatar, role, enabled, created_at, updated_at) FROM stdin;
u2	Nguyễn Văn An	\N	an.nguyen@example.com	$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta	0912 345 678	36 Phố Cổ, Hoàn Kiếm, Hà Nội	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop	owner	t	2026-05-01 17:50:52.035122	2026-05-01 17:50:52.035122
u3	山田 花子	山田 花子	yamada@example.com	$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta	+81 80-9876-5432	Ba Đình, Hà Nội	https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop	diner	t	2026-05-01 17:50:52.035122	2026-05-01 17:50:52.035122
u4	Trần Thị Bích	\N	bich.tran@example.com	$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta	0987 654 321	Tây Hồ, Hà Nội	https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop	owner	t	2026-05-01 17:50:52.035122	2026-05-01 17:50:52.035122
u5	鈴木 一郎	鈴木 一郎	suzuki@example.com	$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta	+81 70-5555-1234	Đống Đa, Hà Nội	https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop	diner	t	2026-05-01 17:50:52.035122	2026-05-01 17:50:52.035122
u1	田中 太郎	田中 太郎	tanaka@example.com	$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta	+81 90-1234-5679	Hoàn Kiếm, Hà Nội, Việt Nam	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop	diner	t	2026-05-01 17:50:52.035122	2026-05-02 01:17:46.104426
u-699b6f66-433c-4aae-9846-e0403839141b	Lương Văn Hưng	\N	luongvanhungnet@gmail.com	123456	+81347826500	Bạch Mai, Hai Bà Trưng, Hà Nội	\N	diner	t	2026-05-02 16:27:34.409621	2026-05-02 16:28:20.258477
\.


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 8, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 1, false);


--
-- Name: restaurant_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.restaurant_images_id_seq', 67, true);


--
-- Name: restaurant_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.restaurant_tags_id_seq', 26, true);


--
-- Name: review_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.review_images_id_seq', 9, true);


--
-- Name: review_reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.review_reactions_id_seq', 15, true);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: restaurant_images restaurant_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_images
    ADD CONSTRAINT restaurant_images_pkey PRIMARY KEY (id);


--
-- Name: restaurant_tags restaurant_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_tags
    ADD CONSTRAINT restaurant_tags_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: review_images review_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_pkey PRIMARY KEY (id);


--
-- Name: review_reactions review_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT review_reactions_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: share_links share_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_pkey PRIMARY KEY (id);


--
-- Name: share_links share_links_share_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_share_token_key UNIQUE (share_token);


--
-- Name: restaurant_tags uq_restaurant_tag; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_tags
    ADD CONSTRAINT uq_restaurant_tag UNIQUE (restaurant_id, tag_name);


--
-- Name: review_reactions uq_review_reaction_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT uq_review_reaction_user UNIQUE (review_id, user_id);


--
-- Name: reviews uq_review_user_restaurant; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_review_user_restaurant UNIQUE (restaurant_id, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_conversations_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_restaurant_id ON public.conversations USING btree (restaurant_id);


--
-- Name: idx_menu_items_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_restaurant_id ON public.menu_items USING btree (restaurant_id);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_restaurant_tags_tag_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_restaurant_tags_tag_name ON public.restaurant_tags USING btree (tag_name);


--
-- Name: idx_restaurants_avg_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_restaurants_avg_price ON public.restaurants USING btree (avg_price);


--
-- Name: idx_restaurants_lat_lng; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_restaurants_lat_lng ON public.restaurants USING btree (lat, lng);


--
-- Name: idx_restaurants_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_restaurants_owner_id ON public.restaurants USING btree (owner_id);


--
-- Name: idx_restaurants_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_restaurants_rating ON public.restaurants USING btree (rating);


--
-- Name: idx_restaurants_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_restaurants_status ON public.restaurants USING btree (status);


--
-- Name: idx_review_reactions_review_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_reactions_review_id ON public.review_reactions USING btree (review_id);


--
-- Name: idx_review_reactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_reactions_user_id ON public.review_reactions USING btree (user_id);


--
-- Name: idx_reviews_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_restaurant_id ON public.reviews USING btree (restaurant_id);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_share_links_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_share_links_restaurant_id ON public.share_links USING btree (restaurant_id);


--
-- Name: idx_share_links_share_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_share_links_share_token ON public.share_links USING btree (share_token);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: conversation_participants fk_conversation_participant_conversation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT fk_conversation_participant_conversation FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants fk_conversation_participant_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT fk_conversation_participant_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations fk_conversation_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT fk_conversation_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;


--
-- Name: menu_items fk_menu_item_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT fk_menu_item_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: messages fk_message_conversation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages fk_message_receiver; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_message_receiver FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: messages fk_message_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_message_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;


--
-- Name: messages fk_message_sender; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: restaurant_images fk_restaurant_image_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_images
    ADD CONSTRAINT fk_restaurant_image_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: restaurants fk_restaurant_owner; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT fk_restaurant_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: restaurant_tags fk_restaurant_tag_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_tags
    ADD CONSTRAINT fk_restaurant_tag_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: review_images fk_review_image_review; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT fk_review_image_review FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_reactions fk_review_reaction_review; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT fk_review_reaction_review FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_reactions fk_review_reaction_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_reactions
    ADD CONSTRAINT fk_review_reaction_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews fk_review_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_review_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: reviews fk_review_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: share_links fk_share_link_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT fk_share_link_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: share_links fk_share_link_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT fk_share_link_user FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

