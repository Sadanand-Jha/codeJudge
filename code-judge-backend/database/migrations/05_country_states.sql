CREATE TABLE country_states (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country_id INT NOT NULL,
    country_code VARCHAR(5),
    country_name VARCHAR(255)
);