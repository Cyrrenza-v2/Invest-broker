-- Foreign tables have no row-level security of their own. Keep them inaccessible
-- to browser roles; privileged backend functions may use them as needed.
REVOKE ALL PRIVILEGES ON TABLE public."Invest-broker" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."Invest-brokersc" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."Invest-broker c" FROM anon, authenticated;
