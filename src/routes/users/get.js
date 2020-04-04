const middle = (swaggerInfo) => {
    return (req, res, next) => {
        console.log('req: ', req);
        // console.log('req.url: ', req.originalUrl);
        // console.log('req.params: ', req.params);
        const rawPath = req.route.path;
        console.log('rawPath: ', rawPath);
        const matches = rawPath.match(/:[\w|-]+/g);
        console.log('matches: ', matches);
        const final = rawPath.replace(/:([\w|-]+)/g, `{$1}`);
        console.log('final: ', final);
        // "/users/{id}": {
        //     "get": {
        //     "description": "Returns the user with the id",
        //     "parameters": [
        //         {
        //         "name": "id",
        //         "in": "path",
        //         "description": "Id of the user",
        //         "required": true,
        //         "type": "number"
        //         }
        //     ],
        next();
    }
}

const info = {
    path: "/users/{id}/names", // optional
    description: 'A basic route',
    params: {
        id:  'The id of the user',
        uuid: 'The uuid',
    }
}

module.exports = (router) => {
    router.get('/users/:id/names/:uuid', middle(info), (req, res) => {
            console.log('hi: ', );
            res.send({
                id: req.params.id,
                name: req.query.name,
            });
        });
};