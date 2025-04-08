describe('Use third-party library in worker', () => {
    it('Test using third-party library in worker', () => {
      cy.visit('/thirdparty.html');
      cy.get('#test-res').should('have.text', 12);
    });
  });
  