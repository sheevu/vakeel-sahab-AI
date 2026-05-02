
-- Seed Acts
INSERT INTO acts (act_name, section_number, title, content, keywords) VALUES 
('Bharatiya Nyaya Sanhita (BNS)', '318', 'Cheating', 'Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person... is said to cheat.', '["cheating","fraud","property","BNS"]'),
('Indian Penal Code (IPC)', '420', 'Cheating and dishonestly inducing delivery of property', 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person... shall be punished with imprisonment of either description for a term which may extend to seven years.', '["cheating","fraud","IPC 420"]'),
('Code of Criminal Procedure (CrPC)', '482', 'Saving of inherent power of High Court', 'Nothing in this Code shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice.', '["inherent powers","FIR quashing","High Court"]');

-- Seed Judgments
INSERT INTO judgments (case_name, citation, judgment_date, bench_strength, ratio_decidendi, summary) VALUES 
('Kesavananda Bharati v. State of Kerala', '(1973) 4 SCC 225', '1973-04-24', 13, 'The Parliament has the power to amend the Constitution, but it cannot alter its Basic Structure.', 'Landmark case defining the Basic Structure doctrine of the Indian Constitution.'),
('Arnesh Kumar v. State of Bihar', '(2014) 8 SCC 273', '2014-07-02', 2, 'Arrest should be the exception, not the rule, especially in cases with punishment less than 7 years like 498A.', 'Guidelines to prevent unnecessary arrests in matrimonial disputes.');

-- Seed FTS Index
INSERT INTO legal_search_index (act_name, section_number, content) VALUES 
('Bharatiya Nyaya Sanhita (BNS)', '318', 'Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person... is said to cheat.'),
('Indian Penal Code (IPC)', '420', 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person... shall be punished with imprisonment of either description for a term which may extend to seven years.'),
('Code of Criminal Procedure (CrPC)', '482', 'Nothing in this Code shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice.');

INSERT INTO legal_search_index (case_name, ratio_decidendi) VALUES 
('Kesavananda Bharati v. State of Kerala', 'The Parliament has the power to amend the Constitution, but it cannot alter its Basic Structure.'),
('Arnesh Kumar v. State of Bihar', 'Arrest should be the exception, not the rule, especially in cases with punishment less than 7 years like 498A.');
