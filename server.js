'use strict';

require('dotenv').config();

const express = require('express');
const server = express();

const superagent = require('superagent');
const pg = require('pg');
const method_override = require('method-override');
const cors = require('cors');

server.use(method_override('_method'));
server.use(cors());
server.use(express.urlencoded({ extended: true }));
server.use(express.static('./public'));
server.set('view engine', 'ejs');

const client = new pg.Client(process.env.DATABASE_URL);

const PORT = process.env.PORT || 4000;

server.get('/', (req, res) => {
    let SQL = 'select * from mybooks;';
    client.query(SQL)
        .then(result => {
            // console.log(result.rows);
            res.render('home', { data: result.rows });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});

server.get('/search', (req, res) => {
    res.render('search');
});


server.post('/searchForm', (req, res) => {
    let search = req.body.search;
    let term = req.body.title;
    let url = `https://www.googleapis.com/books/v1/volumes?q=+${term}:${search}`;
    superagent.get(url)
        .then(result => {
            // console.log(result.body.items);
            let data = result.body.items.map(function (it) {
                return new Books(it.volumeInfo);
            });
            res.render('view', { data: data });

        })

        .catch(error => {
            res.render('error', { error: error });
        });
});

server.post('/inserttodb', (req, res) => {
    console.log(req.body);
    let { title, author, isbn, img, description } = req.body;
    let SQL = 'INSERT INTO mybooks (title, author, isbn, img, description) VALUES ($1,$2,$3,$4,$5) RETURNING *';
    let safeValues = [title, author, isbn, img, description];
    client.query(SQL, safeValues)
        .then(result => {
            // console.log(result.rows[0].id);
            res.redirect(`/viewdetails/${result.rows[0].id}`);
        })
        .catch(error => {
            res.render('error', { error: error });
        });

});

server.get('/viewdetails/:id', (req, res) => {
    let SQL = 'select * from mybooks where id=$1;';
    let safeValue = [req.params.id];
    client.query(SQL, safeValue)
        .then(result => {
            res.render('viewDetailsPage', { data: result.rows[0] });
        })
        .catch(error => {
            res.render('error', { error: error });
        });
})


server.put('/update/:id', (req, res) => {
    let SQL = 'update mybooks set title=$1, author=$2 , isbn=$3, img=$4, description=$5 where id = $6;';
    let { title, author, isbn, img, description } = req.body;
    let safeValues = [title, author, isbn, img, description, req.params.id];
    client.query(SQL, safeValues)
        .then(result => {
            res.redirect(`/viewdetails/${req.params.id}`);
        })
        .catch(error => {
            res.render('error', { error: error });
        });
});

server.delete('/delete/:id', (req, res) => {
    let SQL = 'delete from mybooks where id = $1;';
    let safeValue = [req.params.id];
    client.query(SQL, safeValue)
        .then(result => {
            res.redirect('/')
        })
        .catch(error => {
            res.render('error', { error: error });
        });
})
server.get('*', (req, res) => {
    res.render('404');
});


function Books(item) {
    this.title = (item.title) ? item.title : 'title N/A';
    this.author = (item.authors) ? item.authors.join(', ') : 'author N/A';
    this.isbn = (item.industryIdentifiers.identifier) ? item.industryIdentifiers[0].identifier : 'isbn N/A';
    this.img = (item.imageLinks.thumbnail) ? item.imageLinks.thumbnail : 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/1200px-No-Image-Placeholder.svg.png';
    this.description = (item.description) ? item.description : 'description N/A';
}

client.connect()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Listening to PORT ${PORT}`);
        });
    });

