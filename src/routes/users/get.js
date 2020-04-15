module.exports = (router) => {
    router.get('/users/:id', (req, res) => {
        res.send({
            id: req.params.id,
            name: req.query.name,
        });
    });
};