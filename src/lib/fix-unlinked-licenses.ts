import { gql } from '@apollo/client'

// Query to get all licenses and users for linking
export const GET_LICENSES_AND_USERS = gql`
  query GetLicensesAndUsers {
    licenses {
      id
      licenseKey
      user {
        id
        email
      }
      orderItem {
        id
        order {
          id
          customerEmail
        }
      }
    }
    
    users {
      id
      email
    }
  }
`

export async function linkUnlinkedLicenses(apolloClient: any) {
  try {
    console.log('Looking for unlinked licenses to fix...')
    
    // Get all licenses and users
    const { data } = await apolloClient.query({
      query: GET_LICENSES_AND_USERS,
      fetchPolicy: 'network-only'
    })
    
    const allLicenses = data?.licenses || []
    const users = data?.users || []
    
    // Filter to only unlinked licenses (where user is null)
    const unlinkedLicenses = allLicenses.filter((license: any) => !license.user)
    
    console.log(`Found ${unlinkedLicenses.length} unlinked licenses`)
    console.log(`Found ${users.length} users`)
    
    let linkedCount = 0
    
    // For each unlinked license, try to find a matching user
    for (const license of unlinkedLicenses) {
      const orderEmail = license.orderItem?.order?.customerEmail
      
      if (!orderEmail) {
        console.log(`License ${license.licenseKey} has no order email, skipping`)
        continue
      }
      
      // Find user with matching email
      const matchingUser = users.find((user: any) => user.email === orderEmail)
      
      if (matchingUser) {
        console.log(`Linking license ${license.licenseKey} to user ${matchingUser.email}`)
        
        // Update the license to link it to the user
        await apolloClient.mutate({
          mutation: gql`
            mutation LinkLicenseToUser($licenseId: ID!, $userId: ID!) {
              updateLicense(
                where: { id: $licenseId }
                data: { user: { connect: { id: $userId } } }
              ) {
                id
                licenseKey
                user {
                  id
                  email
                }
              }
            }
          `,
          variables: {
            licenseId: license.id,
            userId: matchingUser.id
          }
        })
        
        linkedCount++
      } else {
        console.log(`No user found for email ${orderEmail} (license ${license.licenseKey})`)
      }
    }
    
    console.log(`Successfully linked ${linkedCount} licenses`)
    return { success: true, linkedCount }
    
  } catch (error) {
    console.error('Error linking unlinked licenses:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
