-- Seed data for dev and test environments
-- Automatically executed by Hibernate on startup when database.generation=drop-and-create

INSERT INTO event (id, title, description, date, location) VALUES (1, 'Cérémonie de remise des diplômes', 'Remise annuelle des diplômes de bachelor et master de la Faculté des sciences.', '2026-06-15', 'Uni Mail, Genève');
INSERT INTO event (id, title, description, date, location) VALUES (2, 'Journée portes ouvertes', 'Découvrez les formations et les laboratoires de l''UNIGE. Visites guidées et présentations.', '2026-04-25', 'Campus Uni Carl-Vogt');
INSERT INTO event (id, title, description, date, location) VALUES (3, 'Conférence : Intelligence artificielle et société', 'Conférence publique organisée par le département d''informatique sur les enjeux de l''IA.', '2026-05-10', 'Uni Dufour, Auditoire A');
INSERT INTO event (id, title, description, date, location) VALUES (4, 'Tournoi de tennis de table inter-facultés', 'Compétition sportive ouverte à tous les étudiants et membres du personnel.', '2026-04-18', 'Plaine de Plainpalais');
ALTER SEQUENCE event_seq RESTART WITH 5;
