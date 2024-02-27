const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../index');
const should = chai.should();

chai.use(chaiHttp);

describe('/GET transactions/most-purchased/:userId', () => {
    it('it should GET the most purchased product by the user within the date range', (done) => {
        chai.request(server)
            .get('/transactions/most-purchased/1?startDate=2017-01-01&endDate=2022-12-31')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('mostPurchasedProduct');
                done();
            });
    });
});