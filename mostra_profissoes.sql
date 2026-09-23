CREATE DATABASE IF NOT EXISTS mostra_profissoes;
USE mostra_profissoes;


CREATE TABLE inscricoes (
	id int AUTO_INCREMENT PRIMARY KEY,
	nome VARCHAR (150) NOT NULL,
	idade INT NOT NULL,
	telefone VARCHAR(20) NOT NULL,
	email VARCHAR(320) NOT NULL,
	curso VARCHAR(100) NOT NULL,
	novo VARCHAR(100),
	outro VARCHAR(100),
	novidade TINYINT(1) DEFAULT 0, -- 0 no caso de não desejar e 1 caso queira
	feedback TEXT,
	saber ENUM(
		'Instagram',
        'WhatsApp',
        'Professor',
        'Amigo/Colega',
        'Site da faculdade',
        'Cartaz',
        'Outro'
	), -- campo perguntando como a pessoa ficou sabendo do evento [whatsapp, instagram, amigos, professores e etc]
	data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
