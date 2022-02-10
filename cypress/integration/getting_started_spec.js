// Some basic integration tests that serve as a forcing function to acknowledge testing
// when adding/removing content
describe('The Getting Start Flow', () => {
    beforeEach(() => {
        cy.visit('')
    })

    it('Getting Started Flow tab exists', () => {
        cy.get('#red-ui-tab-c86af370eff94afa > .red-ui-tab-label').should('exist')
    })

    it('Has expected nodes in Flow', () => {
        cy.contains('(Engineer) Unicorn Getting Started').click()
        cy.get('.red-ui-flow-node-group').should('have.length', 9)
    })

})