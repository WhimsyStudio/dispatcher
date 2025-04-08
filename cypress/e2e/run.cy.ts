describe('Run function in worker dynamically', () => {
    it('Test running function in worker dynamically', () => {
      cy.visit('/run.html');
      cy.get('#test-res').should('have.text', 40);
    });
  });
  