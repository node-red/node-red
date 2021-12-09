describe('The Home Page', () => {
    beforeEach(() => {
        cy.visit('')
    })
    it('has a flow', () => {
        cy.get('.red-ui-text-bidi-aware').should('exist')
    })
    it('has a node', () => {
        cy.get('.red-ui-palette-node').should('exist')
    })
    context('with a node', () => {
        it('has an input', ()=> {
            cy.get('#red-ui-palette-common-input').should('exist')
        })
        it('has an output', ()=> {
            cy.get('#red-ui-palette-common-output').should('exist')
        })
    })
})